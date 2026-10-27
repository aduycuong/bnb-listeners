import { eq } from "drizzle-orm";

import { projects } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import { getReports } from "@/lib/metrics/services/get-reports";
import type { ReportPeriod } from "@/lib/metrics/types";
import { parseProjectCase } from "@/lib/projects/project-cases";

import { REPORT_SNAPSHOT_REPORTS } from "../config";
import type { ReportMetrics } from "../types";

/** Snapshot of the report numbers (D29): `REPORT_SNAPSHOT_REPORTS` for the period. */
export async function loadReportMetrics(params: {
  projectId: string;
  period: ReportPeriod;
}): Promise<ReportMetrics> {
  const [project] = await db
    .select({ name: projects.name, listeningCase: projects.listeningCase })
    .from(projects)
    .where(eq(projects.id, params.projectId))
    .limit(1);
  if (!project) throw new NotFoundError("Project", params.projectId);

  const result = await getReports({ ...params, reports: REPORT_SNAPSHOT_REPORTS });

  return {
    projectName: project.name,
    case: parseProjectCase(project.listeningCase),
    timezone: result.timezone,
    period: result.period,
    subject: result.subject?.name ?? null,
    reports: Object.fromEntries(
      result.reports.map((report) => [report.key, report]),
    ) as ReportMetrics["reports"],
  };
}
