import { getReports } from "@/lib/metrics/services/get-reports";
import type { ReportPeriod, ReportRequest } from "@/lib/metrics/types";

import { resolveToolPeriod } from "./resolve-tool-period";

/**
 * Reports of a tool as one object for the model: the period, then each report's data under its
 * key, or `{ unavailable }` with the reason when the project has no numbers for it.
 */
export async function loadToolReports(
  projectId: string,
  period: ReportPeriod | undefined,
  reports: readonly ReportRequest[],
) {
  const result = await getReports({ projectId, period: resolveToolPeriod(period), reports });
  return {
    period: result.period,
    timezone: result.timezone,
    subject: result.subject?.name ?? null,
    ...Object.fromEntries(
      result.reports.map((report) => [
        report.key,
        report.availability === "ok" ? report.data : { unavailable: report.availability },
      ]),
    ),
  };
}
