import { and, asc, eq } from "drizzle-orm";

import {
  projectAspects,
  projectEntities,
  projectQueries,
  projects,
  projectSources,
} from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";

import type { EntityRole } from "../case-templates";
import { parseProjectCase } from "../project-cases";
import type { GetProjectConfigParams, ProjectConfigDetail } from "../types";

export async function getProjectConfig(
  params: GetProjectConfigParams,
): Promise<ProjectConfigDetail> {
  const [project] = await db
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.id, params.projectId),
        eq(projects.workspaceId, params.workspaceId),
      ),
    )
    .limit(1);

  if (!project) {
    throw new NotFoundError("project", params.projectId);
  }

  const [entities, queries, aspects, sourceRows] = await Promise.all([
    db
      .select()
      .from(projectEntities)
      .where(eq(projectEntities.projectId, project.id))
      .orderBy(asc(projectEntities.sortOrder), asc(projectEntities.createdAt)),
    db.select().from(projectQueries).where(eq(projectQueries.projectId, project.id)),
    db
      .select()
      .from(projectAspects)
      .where(eq(projectAspects.projectId, project.id))
      .orderBy(asc(projectAspects.sortOrder), asc(projectAspects.createdAt)),
    db
      .select({ sourceId: projectSources.sourceId })
      .from(projectSources)
      .where(eq(projectSources.projectId, project.id)),
  ]);

  const queryByEntity = new Map(
    queries.filter((query) => query.entityId).map((query) => [query.entityId, query]),
  );

  return {
    projectId: project.id,
    case: parseProjectCase(project.listeningCase),
    mode: project.mode === "sandbox" ? "sandbox" : "live",
    configVersion: project.configVersion,
    caseConfig: project.caseConfig,
    entities: entities.map((entity) => {
      const query = queryByEntity.get(entity.id);
      return {
        id: entity.id,
        role: entity.role as EntityRole,
        name: entity.name,
        aliases: entity.aliases,
        queryId: query?.id ?? null,
        withTerms: query?.withTerms ?? [],
        exclude: query?.exclude ?? [],
        queryVersion: query?.version ?? null,
      };
    }),
    aspects: aspects.map((aspect) => ({
      id: aspect.id,
      key: aspect.key,
      name: aspect.name,
      description: aspect.description,
    })),
    sourceIds: sourceRows.map((row) => row.sourceId),
  };
}
