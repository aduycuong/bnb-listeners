import { asc, eq } from "drizzle-orm";

import { projectAspects, projectEntities, projects } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import { getCaseTemplate } from "@/lib/projects/case-templates";
import { isAvailableProjectCase, parseProjectCase } from "@/lib/projects/project-cases";

import type { ProjectEnrichContext } from "../types";
import { computeEnrichSignature } from "../utils/compute-enrich-signature";

export async function loadEnrichContext(params: {
  projectId: string;
}): Promise<ProjectEnrichContext> {
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, params.projectId))
    .limit(1);
  if (!project) throw new NotFoundError("project", params.projectId);

  const projectCase = parseProjectCase(project.listeningCase);
  const template = isAvailableProjectCase(projectCase)
    ? getCaseTemplate(projectCase, project.caseVersion)
    : null;
  const roleLabels = new Map(template?.roles.map((role) => [role.role as string, role.label]) ?? []);

  const [aspectRows, entityRows] = await Promise.all([
    db
      .select()
      .from(projectAspects)
      .where(eq(projectAspects.projectId, project.id))
      .orderBy(asc(projectAspects.sortOrder)),
    db
      .select()
      .from(projectEntities)
      .where(eq(projectEntities.projectId, project.id))
      .orderBy(asc(projectEntities.sortOrder)),
  ]);

  const aspects = aspectRows.map((row) => ({
    id: row.id,
    key: row.key,
    name: row.name,
    description: row.description,
  }));
  const entities = entityRows.map((row, index) => ({
    id: row.id,
    ref: `e${index + 1}`,
    name: row.name,
    role: roleLabels.get(row.role) ?? row.role,
    aliases: row.aliases,
  }));
  const extractions = template?.extractions ?? [];

  return {
    projectId: project.id,
    caseLabel: projectCase,
    aspects,
    entities,
    extractions,
    signature: computeEnrichSignature({
      caseLabel: projectCase,
      caseVersion: project.caseVersion,
      aspects,
      entities,
      extractionKeys: extractions.map((extraction) => extraction.key),
    }),
  };
}
