import { randomUUID } from "node:crypto";

import { and, eq, inArray } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";

import {
  projectAspects,
  projectEntities,
  projectQueries,
  projects,
  projectSources,
} from "@/db/schema";
import { InvalidInputError, NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";

import { CASE_TEMPLATES } from "../case-templates";
import type { UpdateProjectConfigParams, UpdateProjectConfigResult } from "../types";
import { toAspectKey } from "../utils/to-aspect-key";
import { toQueryInclude } from "../utils/to-query-include";
import { assertSourcesSelectable } from "./assert-sources-selectable";
import { getProjectConfig } from "./get-project-config";

function sameList(a: readonly string[], b: readonly string[]) {
  return a.length === b.length && a.every((item, index) => item === b[index]);
}

function sameSet(a: readonly string[], b: readonly string[]) {
  const left = new Set(a);
  const right = new Set(b);
  return left.size === right.size && [...left].every((item) => right.has(item));
}

/**
 * Replaces a project's config. Entity and aspect ids are kept so later analysis
 * rows stay linked. A query's `version` goes up only when its terms change;
 * `config_version` goes up when anything changes.
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

  const template = CASE_TEMPLATES[params.case];
  const caseConfig = template.configSchema.parse(params.caseConfig);
  const projectId = current.projectId;
  const writes: BatchItem<"pg">[] = [];
  let changed =
    current.mode !== params.mode ||
    JSON.stringify(current.caseConfig) !== JSON.stringify(caseConfig);

  // Entities and their queries.
  const currentEntities = new Map(current.entities.map((entity) => [entity.id, entity]));
  const keptEntityIds = new Set<string>();

  params.entities.forEach((entity, sortOrder) => {
    const include = toQueryInclude(entity);
    const existing = entity.id ? currentEntities.get(entity.id) : undefined;

    if (entity.id && !existing) {
      throw new NotFoundError("project entity", entity.id);
    }

    if (!existing) {
      const entityId = randomUUID();
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
        }),
      );
    } else if (
      !sameSet(currentInclude, include) ||
      !sameSet(existing.withTerms, entity.withTerms) ||
      !sameSet(existing.exclude, entity.exclude)
    ) {
      changed = true;
      writes.push(
        db
          .update(projectQueries)
          .set({
            include,
            withTerms: entity.withTerms,
            exclude: entity.exclude,
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
    if (aspect.id && !currentAspects.has(aspect.id)) {
      throw new NotFoundError("project aspect", aspect.id);
    }
    if (aspect.id) keptAspectIds.add(aspect.id);
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
    const existing = aspect.id ? currentAspects.get(aspect.id) : undefined;

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

  if (!changed) {
    return { ...current, message: "Cấu hình không thay đổi." };
  }

  await db.batch([
    db
      .update(projects)
      .set({
        mode: params.mode,
        caseConfig,
        configVersion: current.configVersion + 1,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, projectId)),
    ...writes,
  ]);

  const updated = await getProjectConfig({
    workspaceId: params.workspaceId,
    projectId,
  });

  return { ...updated, message: "Đã lưu cấu hình." };
}
