import { and, eq, inArray } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";

import {
  alertRules,
  projectAspects,
  projectEntities,
  projectQueries,
  projects,
  projectSources,
} from "@/db/schema";
import { InvalidInputError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import { triggerProjectEnrich } from "@/lib/enrichment/services/trigger-project-enrich";
import { syncProjectMatch } from "@/lib/matching/services/sync-project-match";

import { getCaseTemplate, hasCaseVersion } from "../case-templates";
import type { UpdateProjectConfigParams, UpdateProjectConfigResult } from "../types";
import { toAlertRuleRow } from "../utils/to-alert-rule-rows";
import { toAspectKey } from "../utils/to-aspect-key";
import { toQueryInclude } from "../utils/to-query-include";
import { assertConfigIdsUnused } from "./assert-config-ids-unused";
import { assertSourcesSelectable } from "./assert-sources-selectable";
import { getProjectConfig } from "./get-project-config";

function sameList(a: readonly string[], b: readonly string[]) {
  return a.length === b.length && a.every((item, index) => item === b[index]);
}

/** JSON with sorted keys; Postgres jsonb does not keep key order. */
function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .filter((key) => (value as Record<string, unknown>)[key] !== undefined)
      .map((key) => `${JSON.stringify(key)}:${stableJson((value as Record<string, unknown>)[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function sameSet(a: readonly string[], b: readonly string[]) {
  const left = new Set(a);
  const right = new Set(b);
  return left.size === right.size && [...left].every((item) => right.has(item));
}

/**
 * Replaces a project's config. Entity and aspect ids are kept so later analysis
 * rows stay linked. A query's `version` goes up only when its terms change;
 * `config_version` goes up when anything that affects analysis changes.
 * Alert rules and delivery settings are saved without bumping it.
 */
export async function updateProjectConfig(
  params: UpdateProjectConfigParams,
): Promise<UpdateProjectConfigResult> {
  const current = await getProjectConfig({
    workspaceId: params.workspaceId,
    projectId: params.projectId,
  });

  if (current.case !== params.case) {
    throw new InvalidInputError("Không đổi được kiểu case của project đã tạo.");
  }

  await assertSourcesSelectable({ sourceIds: params.sourceIds, mode: params.mode });

  // Ids not in the current config are new items created in the form.
  const currentEntityIds = new Set(current.entities.map((entity) => entity.id));
  const currentAspectIds = new Set(current.aspects.map((aspect) => aspect.id));
  const currentRuleIds = new Set(current.alerts.rules.map((rule) => rule.id));
  await assertConfigIdsUnused({
    entityIds: params.entities.map((item) => item.id).filter((id) => !currentEntityIds.has(id)),
    aspectIds: params.aspects.map((item) => item.id).filter((id) => !currentAspectIds.has(id)),
    ruleIds: params.alerts.rules.map((item) => item.id).filter((id) => !currentRuleIds.has(id)),
  });

  // A project stays on its case version until the user saves an upgraded config.
  if (params.caseVersion < current.caseVersion || !hasCaseVersion(params.case, params.caseVersion)) {
    throw new InvalidInputError("Không chuyển được sang phiên bản case này.");
  }
  const upgraded = params.caseVersion > current.caseVersion;

  const template = getCaseTemplate(params.case, params.caseVersion);
  const caseConfig = template.configSchema.parse(params.caseConfig);
  const projectId = current.projectId;
  const writes: BatchItem<"pg">[] = [];
  let changed =
    upgraded ||
    current.mode !== params.mode ||
    stableJson(current.caseConfig) !== stableJson(caseConfig);

  // Entities and their queries.
  const currentEntities = new Map(current.entities.map((entity) => [entity.id, entity]));
  const keptEntityIds = new Set<string>();

  params.entities.forEach((entity, sortOrder) => {
    const include = toQueryInclude(entity);
    const existing = currentEntities.get(entity.id);

    if (!existing) {
      const entityId = entity.id;
      changed = true;
      writes.push(
        db.insert(projectEntities).values({
          id: entityId,
          projectId,
          role: entity.role,
          name: entity.name,
          aliases: entity.aliases,
          sortOrder,
        }),
        db.insert(projectQueries).values({
          projectId,
          entityId,
          include,
          withTerms: entity.withTerms,
          exclude: entity.exclude,
          ambiguous: entity.ambiguousAliases,
        }),
      );
      return;
    }

    keptEntityIds.add(existing.id);
    const currentIndex = current.entities.indexOf(existing);
    if (
      existing.role !== entity.role ||
      existing.name !== entity.name ||
      !sameList(existing.aliases, entity.aliases) ||
      currentIndex !== sortOrder
    ) {
      changed = true;
      writes.push(
        db
          .update(projectEntities)
          .set({
            role: entity.role,
            name: entity.name,
            aliases: entity.aliases,
            sortOrder,
          })
          .where(eq(projectEntities.id, existing.id)),
      );
    }

    const currentInclude = toQueryInclude(existing);
    if (!existing.queryId) {
      changed = true;
      writes.push(
        db.insert(projectQueries).values({
          projectId,
          entityId: existing.id,
          include,
          withTerms: entity.withTerms,
          exclude: entity.exclude,
          ambiguous: entity.ambiguousAliases,
        }),
      );
    } else if (
      !sameSet(currentInclude, include) ||
      !sameSet(existing.withTerms, entity.withTerms) ||
      !sameSet(existing.exclude, entity.exclude) ||
      !sameSet(existing.ambiguousAliases, entity.ambiguousAliases)
    ) {
      changed = true;
      writes.push(
        db
          .update(projectQueries)
          .set({
            include,
            withTerms: entity.withTerms,
            exclude: entity.exclude,
            ambiguous: entity.ambiguousAliases,
            version: (existing.queryVersion ?? 1) + 1,
          })
          .where(eq(projectQueries.id, existing.queryId)),
      );
    }
  });

  const removedEntityIds = current.entities
    .filter((entity) => !keptEntityIds.has(entity.id))
    .map((entity) => entity.id);
  if (removedEntityIds.length > 0) {
    changed = true;
    // Queries cascade with their entity.
    writes.push(
      db
        .delete(projectEntities)
        .where(
          and(
            eq(projectEntities.projectId, projectId),
            inArray(projectEntities.id, removedEntityIds),
          ),
        ),
    );
  }

  // Aspects.
  const currentAspects = new Map(current.aspects.map((aspect) => [aspect.id, aspect]));
  const keptAspectIds = new Set<string>();
  params.aspects.forEach((aspect) => {
    if (currentAspects.has(aspect.id)) keptAspectIds.add(aspect.id);
  });
  const takenKeys = new Set(
    current.aspects.filter((aspect) => keptAspectIds.has(aspect.id)).map((aspect) => aspect.key),
  );

  const removedAspectIds = current.aspects
    .filter((aspect) => !keptAspectIds.has(aspect.id))
    .map((aspect) => aspect.id);
  if (removedAspectIds.length > 0) {
    changed = true;
    writes.push(
      db
        .delete(projectAspects)
        .where(
          and(
            eq(projectAspects.projectId, projectId),
            inArray(projectAspects.id, removedAspectIds),
          ),
        ),
    );
  }

  params.aspects.forEach((aspect, sortOrder) => {
    const existing = currentAspects.get(aspect.id);

    if (!existing) {
      const templateKey = template.aspects.find((item) => item.name === aspect.name)?.key;
      const key =
        templateKey && !takenKeys.has(templateKey)
          ? templateKey
          : toAspectKey(aspect.name, takenKeys);
      takenKeys.add(key);
      changed = true;
      writes.push(
        db.insert(projectAspects).values({
          id: aspect.id,
          projectId,
          key,
          name: aspect.name,
          description: aspect.description,
          sortOrder,
        }),
      );
      return;
    }

    if (
      existing.name !== aspect.name ||
      existing.description !== aspect.description ||
      current.aspects.indexOf(existing) !== sortOrder
    ) {
      changed = true;
      writes.push(
        db
          .update(projectAspects)
          .set({ name: aspect.name, description: aspect.description, sortOrder })
          .where(eq(projectAspects.id, existing.id)),
      );
    }
  });

  // Sources.
  const sourceIds = [...new Set(params.sourceIds)];
  if (!sameSet(current.sourceIds, sourceIds)) {
    changed = true;
    writes.push(
      db.delete(projectSources).where(eq(projectSources.projectId, projectId)),
      db
        .insert(projectSources)
        .values(sourceIds.map((sourceId) => ({ projectId, sourceId }))),
    );
  }

  // Alerts: upsert by id so rule ids stay stable for future alert rows.
  const alertsChanged = stableJson(current.alerts) !== stableJson(params.alerts);
  if (alertsChanged) {
    const keptRuleIds = new Set(params.alerts.rules.map((rule) => rule.id));
    const removedRuleIds = current.alerts.rules
      .map((rule) => rule.id)
      .filter((id) => !keptRuleIds.has(id));
    if (removedRuleIds.length > 0) {
      writes.push(
        db
          .delete(alertRules)
          .where(and(eq(alertRules.projectId, projectId), inArray(alertRules.id, removedRuleIds))),
      );
    }
    params.alerts.rules.forEach((rule, sortOrder) => {
      const row = toAlertRuleRow(rule, sortOrder);
      writes.push(
        currentRuleIds.has(rule.id)
          ? db
              .update(alertRules)
              .set({
                kind: row.kind,
                params: row.params,
                enabled: row.enabled,
                sortOrder,
                updatedAt: new Date(),
              })
              .where(and(eq(alertRules.id, rule.id), eq(alertRules.projectId, projectId)))
          : db.insert(alertRules).values({ ...row, projectId }),
      );
    });
  }

  if (!changed && !alertsChanged) {
    return { ...current, message: "Cấu hình không thay đổi." };
  }

  await db.batch([
    db
      .update(projects)
      .set({
        mode: params.mode,
        caseVersion: params.caseVersion,
        caseConfig,
        notificationConfig: {
          channels: params.alerts.channels,
          recipients: params.alerts.recipients,
          reportSchedule: params.alerts.reportSchedule,
        },
        configVersion: changed ? current.configVersion + 1 : current.configVersion,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, projectId)),
    ...writes,
  ]);

  // A new match ends by starting Enrich; otherwise aspects or entities may still have changed.
  const match = await syncProjectMatch({ projectId });
  if (!match.triggered) await triggerProjectEnrich({ projectId });

  const updated = await getProjectConfig({
    workspaceId: params.workspaceId,
    projectId,
  });

  return { ...updated, message: "Đã lưu cấu hình." };
}
