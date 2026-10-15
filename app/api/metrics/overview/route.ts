import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { metricsReportQuerySchema } from "@/lib/metrics/schema";
import { getOverviewMetrics } from "@/lib/metrics/services/get-overview-metrics";

export const GET = createApiHandler(
  { queryParams: metricsReportQuerySchema },
  (params, ctx) => getOverviewMetrics({ ...params, projectId: ctx.projectId! }),
  { allowedRoles: [], minWorkspacePermission: "read", requireProject: true },
);
