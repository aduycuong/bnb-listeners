import { asc, eq } from "drizzle-orm";

import { projectAspects, projectEnrichers, projectEntities, projects } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import { getCaseTemplate } from "@/lib/projects/case-templates";
import { isAvailableProjectCase, parseProjectCase } from "@/lib/projects/project-cases";

import { ENRICH_CONFIG } from "../config";
import { getLlmEnricher } from "../enrichers/llm-enrichers";
import { ENRICHER_REGISTRY, type EnricherKey, type EnricherSpec, isEnricherKey, isReadyEnricher } from "../registry";
import type { ProjectEnrichContext, ProjectEnricherState } from "../types";
import { computeEnricherSignature } from "../utils/compute-enrich-signature";
import { syncProjectEnrichers } from "./sync-project-enrichers";

/**
 * Project config the enrichers need plus the enabled enrichers with their
 * signatures (D18). Seeds `project_enrichers` from the case template when
 * the project has none yet.
 */
export async function loadEnrichContext(params: { projectId: string }): Promise<ProjectEnrichContext> {
  const [project] = await db.select().from(projects).where(eq(projects.id, params.projectId)).limit(1);
  if (!project) throw new NotFoundError("project", params.projectId);

  const projectCase = parseProjectCase(project.listeningCase);
  const template = isAvailableProjectCase(projectCase) ? getCaseTemplate(projectCase, project.caseVersion) : null;
  const roleLabels = new Map(template?.roles.map((role) => [role.role as string, role.label]) ?? []);

  if (template) await syncProjectEnrichers({ projectId: project.id, template });

  const [aspectRows, entityRows, enricherRows] = await Promise.all([
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
    db.select().from(projectEnrichers).where(eq(projectEnrichers.projectId, project.id)),
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

  const base = {
    projectId: project.id,
    workspaceId: project.workspaceId,
    caseLabel: projectCase,
    caseVersion: project.caseVersion,
    aspects,
    entities,
  };

  const enrichers: ProjectEnricherState[] = enricherRows
    .filter((row) => row.enabled && isEnricherKey(row.enricherKey) && isReadyEnricher(row.enricherKey))
    .map((row) => {
      const key = row.enricherKey as EnricherKey;
      const spec: EnricherSpec = ENRICHER_REGISTRY[key];
      const input = spec.kind === "llm" ? getLlmEnricher(key).signatureInput({ ...base, enrichers: [] }) : null;
      return {
        key,
        config: row.config,
        signature: computeEnricherSignature({
          key,
          version: spec.version,
          model: spec.kind === "llm" ? ENRICH_CONFIG.model : spec.model,
          input: { input, config: row.config },
        }),
      };
    });

  return { ...base, enrichers };
}
