import { getCompareMembers } from "@/lib/projects/services/get-compare-members";

import type { GetCompareReportsParams, GetCompareReportsResult, ReportRequest } from "../types";
import { resolveReportWindow } from "../utils/resolve-report-window";
import { getReports } from "./get-reports";

/**
 * The same reports for every member of a compare project (D30), for one period: each member
 * runs `getReports` in its own timezone, in parallel. Series come back per member; averages
 * are for the page to compute (`meanOf`).
 */
export async function getCompareReports<const R extends readonly ReportRequest[]>(
  params: GetCompareReportsParams & { reports: R },
): Promise<GetCompareReportsResult<R>> {
  const [compare, window] = await Promise.all([
    getCompareMembers({ workspaceId: params.workspaceId, projectId: params.projectId }),
    resolveReportWindow(params.projectId, params.period),
  ]);
  const members = await Promise.all(
    compare.members.map(async (member) => {
      const { period: _period, ...result } = await getReports({
        projectId: member.id,
        period: params.period,
        reports: params.reports,
      });
      return { id: member.id, name: member.name, ...result };
    }),
  );

  return {
    period: window.info,
    members,
    sharedAspects: compare.sharedAspects,
    issues: compare.issues,
    warnings: compare.warnings,
  };
}
