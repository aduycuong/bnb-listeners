import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { metricsReportQuerySchema } from "@/lib/metrics/schema";
import { getAuthorMetrics } from "@/lib/metrics/services/get-author-metrics";

export const GET = createApiHandler(
  { queryParams: metricsReportQuerySchema },
  (params, ctx) => getAuthorMetrics({ ...params, projectId: ctx.projectId! }),
  { allowedRoles: [], minWorkspacePermission: "read", requireProject: true },
);
