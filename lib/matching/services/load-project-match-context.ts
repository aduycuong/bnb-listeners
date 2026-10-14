import { eq } from "drizzle-orm";

import { projectEntities, projectQueries, projects, projectSources } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import { getCaseTemplate } from "@/lib/projects/case-templates";
import { isAvailableProjectCase, parseProjectCase } from "@/lib/projects/project-cases";

import type { MatchEntity, ProjectMatchContext } from "../types";
import { compileQuery } from "../utils/compile-query";
import { computeMatchSignature } from "../utils/compute-match-signature";

export async function loadProjectMatchContext(params: {
  projectId: string;
}): Promise<ProjectMatchContext> {
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, params.projectId))
    .limit(1);
  if (!project) throw new NotFoundError("project", params.projectId);

  const [entityRows, queryRows, sourceRows] = await Promise.all([
    db.select().from(projectEntities).where(eq(projectEntities.projectId, project.id)),
    db.select().from(projectQueries).where(eq(projectQueries.projectId, project.id)),
    db
      .select({ sourceId: projectSources.sourceId })
      .from(projectSources)
      .where(eq(projectSources.projectId, project.id)),
  ]);

  const projectCase = parseProjectCase(project.listeningCase);
  const roleLabels = new Map(
    isAvailableProjectCase(projectCase)
      ? getCaseTemplate(projectCase, project.caseVersion).roles.map((role) => [
          role.role as string,
          role.label,
        ])
      : [],
  );

  const enabled = queryRows.filter((query) => query.enabled);
  const entities = new Map<string, MatchEntity>();
  for (const entity of entityRows) {
    const query = enabled.find((item) => item.entityId === entity.id);
    entities.set(entity.id, {
      id: entity.id,
      role: roleLabels.get(entity.role) ?? entity.role,
      name: entity.name,
      aliases: [...entity.aliases, ...(query?.ambiguous ?? [])],
      terms: query?.include ?? [entity.name],
      exclude: query?.exclude ?? [],
    });
  }

  const sourceIds = sourceRows.map((row) => row.sourceId);

  return {
    projectId: project.id,
    workspaceId: project.workspaceId,
    caseLabel: projectCase,
    sourceIds,
    queries: enabled.map(compileQuery),
    entities,
    signature: computeMatchSignature({ queries: queryRows, sourceIds }),
    storedSignature: project.matchSignature,
  };
}
