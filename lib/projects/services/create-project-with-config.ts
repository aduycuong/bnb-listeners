import { randomUUID } from "node:crypto";

import {
  alertRules,
  projectAspects,
  projectEntities,
  projectQueries,
  projects,
  projectSources,
} from "@/db/schema";
import { CreateFailedError, InvalidInputError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";

import { getCaseTemplate, latestCaseVersion } from "../case-templates";
import type { CreateProjectResult, CreateProjectWithConfigParams } from "../types";
import { toAlertRuleRow } from "../utils/to-alert-rule-rows";
import { toAspectKey } from "../utils/to-aspect-key";
import { toProjectListItem } from "../utils/to-project-list-item";
import { toQueryInclude } from "../utils/to-query-include";
import { assertConfigIdsUnused } from "./assert-config-ids-unused";
import { assertSourcesSelectable } from "./assert-sources-selectable";
import { assertUniqueProjectName } from "./assert-unique-project-name";

/** Creates a project with its entities, one query per entity, aspects and sources in one batch. */
export async function createProjectWithConfig(
  params: CreateProjectWithConfigParams,
): Promise<CreateProjectResult> {
  const name = params.name.trim();
  await assertUniqueProjectName(params.workspaceId, name);
  await assertSourcesSelectable({ sourceIds: params.sourceIds, mode: params.mode });
  await assertConfigIdsUnused({
    entityIds: params.entities.map((entity) => entity.id),
    aspectIds: params.aspects.map((aspect) => aspect.id),
    ruleIds: params.alerts.rules.map((rule) => rule.id),
  });

  if (params.caseVersion !== latestCaseVersion(params.case)) {
    throw new InvalidInputError("Project mới phải dùng phiên bản case mới nhất. Tải lại trang rồi thử lại.");
  }

  const template = getCaseTemplate(params.case, params.caseVersion);
  const projectId = randomUUID();
  const entities = params.entities.map((entity, index) => ({ ...entity, sortOrder: index }));
  const takenKeys = new Set<string>();
  const aspects = params.aspects.map((aspect, index) => {
    const templateKey = template.aspects.find((item) => item.name === aspect.name)?.key;
    const key =
      templateKey && !takenKeys.has(templateKey)
        ? templateKey
        : toAspectKey(aspect.name, takenKeys);
    takenKeys.add(key);
    return { ...aspect, key, sortOrder: index };
  });

  const [created] = await db.batch([
    db
      .insert(projects)
      .values({
        id: projectId,
        workspaceId: params.workspaceId,
        name,
        description: params.description?.trim() || null,
        listeningCase: params.case,
        caseVersion: params.caseVersion,
        mode: params.mode,
        caseConfig: template.configSchema.parse(params.caseConfig),
        notificationConfig: {
          channels: params.alerts.channels,
          recipients: params.alerts.recipients,
          reportSchedule: params.alerts.reportSchedule,
        },
      })
      .returning(),
    ...(entities.length > 0
      ? [
          db.insert(projectEntities).values(
            entities.map((entity) => ({
              id: entity.id,
              projectId,
              role: entity.role,
              name: entity.name,
              aliases: entity.aliases,
              sortOrder: entity.sortOrder,
            })),
          ),
          db.insert(projectQueries).values(
            entities.map((entity) => ({
              projectId,
              entityId: entity.id,
              include: toQueryInclude(entity),
              withTerms: entity.withTerms,
              exclude: entity.exclude,
            })),
          ),
        ]
      : []),
    db.insert(projectAspects).values(
      aspects.map((aspect) => ({
        id: aspect.id,
        projectId,
        key: aspect.key,
        name: aspect.name,
        description: aspect.description,
        sortOrder: aspect.sortOrder,
      })),
    ),
    db.insert(projectSources).values(
      [...new Set(params.sourceIds)].map((sourceId) => ({ projectId, sourceId })),
    ),
    ...(params.alerts.rules.length > 0
      ? [
          db.insert(alertRules).values(
            params.alerts.rules.map((rule, index) => ({
              ...toAlertRuleRow(rule, index),
              projectId,
            })),
          ),
        ]
      : []),
  ]);

  const project = created[0];
  if (!project) {
    throw new CreateFailedError("project");
  }

  return {
    ...toProjectListItem(project),
    message: `Đã tạo project “${project.name}”.`,
  };
}
