import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { getReportsBodySchema } from "@/lib/metrics/schema";
import { getCompareReports } from "@/lib/metrics/services/get-compare-reports";
import type { ReportRequest } from "@/lib/metrics/types";

export const POST = createApiHandler(
  { requestBody: getReportsBodySchema },
  (params, ctx) =>
    getCompareReports({
      workspaceId: ctx.workspaceId,
      projectId: ctx.projectId!,
      period: params.period,
      // Params are checked per report against `REPORT_PARAMS_SCHEMAS`.
      reports: params.reports as ReportRequest[],
    }),
  { allowedRoles: [], minWorkspacePermission: "read", requireProject: true },
);
