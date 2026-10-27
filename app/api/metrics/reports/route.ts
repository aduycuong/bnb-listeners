import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { getReportsBodySchema } from "@/lib/metrics/schema";
import { getReports } from "@/lib/metrics/services/get-reports";
import type { ReportRequest } from "@/lib/metrics/types";

export const POST = createApiHandler(
  { requestBody: getReportsBodySchema },
  (params, ctx) =>
    getReports({
      projectId: ctx.projectId!,
      period: params.period,
      // Params are checked per report against `REPORT_PARAMS_SCHEMAS`.
      reports: params.reports as ReportRequest[],
    }),
  { allowedRoles: [], minWorkspacePermission: "read", requireProject: true },
);
