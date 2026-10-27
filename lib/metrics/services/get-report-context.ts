import { asc, eq } from "drizzle-orm";

import { projectEnrichers, projectEntities, projects } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import { ENRICHER_KEYS, isReadyEnricher, type EnricherKey } from "@/lib/enrichment/registry";
import { defaultCaseEnrichers, getCaseTemplate } from "@/lib/projects/case-templates";
import { isAvailableProjectCase, parseProjectCase } from "@/lib/projects/project-cases";

import type { ReportContext, ReportPeriod } from "../types";
import { resolveReportWindow } from "../utils/resolve-report-window";

/**
 * What every report of a request shares: the period, the case and its config, the subject
 * and products, and the enrichers the project runs (the case defaults unless a row of
 * `project_enrichers` turns one off, plus the ones turned on).
 */
export async function getReportContext(params: {
  projectId: string;
  period: ReportPeriod;
}): Promise<ReportContext> {
  const [project] = await db
    .select({
      listeningCase: projects.listeningCase,
      caseVersion: projects.caseVersion,
      caseConfig: projects.caseConfig,
    })
    .from(projects)
    .where(eq(projects.id, params.projectId))
    .limit(1);
  if (!project) throw new NotFoundError("Project", params.projectId);

  const projectCase = parseProjectCase(project.listeningCase);
  const [window, entityRows, enricherRows] = await Promise.all([
    resolveReportWindow(params.projectId, params.period),
    db
      .select({ id: projectEntities.id, name: projectEntities.name, role: projectEntities.role })
      .from(projectEntities)
      .where(eq(projectEntities.projectId, params.projectId))
      .orderBy(asc(projectEntities.sortOrder), asc(projectEntities.name)),
    db
      .select({ key: projectEnrichers.enricherKey, enabled: projectEnrichers.enabled })
      .from(projectEnrichers)
      .where(eq(projectEnrichers.projectId, params.projectId)),
  ]);

  const defaults: EnricherKey[] = isAvailableProjectCase(projectCase)
    ? defaultCaseEnrichers(getCaseTemplate(projectCase, project.caseVersion))
    : [];
  const stored = new Map(enricherRows.map((row) => [row.key, row.enabled]));
  const enrichers = ENRICHER_KEYS.filter(
    (key) => isReadyEnricher(key) && (stored.get(key) ?? defaults.includes(key)),
  );
  const subject = entityRows.find((row) => row.role === "subject");

  return {
    projectId: params.projectId,
    case: projectCase,
    caseConfig: project.caseConfig,
    window,
    subject: subject ? { id: subject.id, name: subject.name } : null,
    products: entityRows
      .filter((row) => row.role === "product")
      .map((row) => ({ id: row.id, name: row.name })),
    enrichers,
  };
}
