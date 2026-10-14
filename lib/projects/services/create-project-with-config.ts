import { randomUUID } from "node:crypto";

import {
  projectAspects,
  projectEntities,
  projectQueries,
  projects,
  projectSources,
} from "@/db/schema";
import { CreateFailedError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";

import { CASE_TEMPLATES } from "../case-templates";
import type { CreateProjectResult, CreateProjectWithConfigParams } from "../types";
import { toAspectKey } from "../utils/to-aspect-key";
import { toProjectListItem } from "../utils/to-project-list-item";
import { toQueryInclude } from "../utils/to-query-include";
import { assertSourcesSelectable } from "./assert-sources-selectable";
import { assertUniqueProjectName } from "./assert-unique-project-name";

/** Creates a project with its entities, one query per entity, aspects and sources in one batch. */
export async function createProjectWithConfig(
  params: CreateProjectWithConfigParams,
): Promise<CreateProjectResult> {
  const name = params.name.trim();
  await assertUniqueProjectName(params.workspaceId, name);
  await assertSourcesSelectable({ sourceIds: params.sourceIds, mode: params.mode });

  const template = CASE_TEMPLATES[params.case];
  const projectId = randomUUID();
  const entities = params.entities.map((entity, index) => ({
    ...entity,
    id: randomUUID(),
    sortOrder: index,
  }));
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
        mode: params.mode,
        caseConfig: template.configSchema.parse(params.caseConfig),
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
