import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { metricsReportQuerySchema } from "@/lib/metrics/schema";
import { getSentimentMetrics } from "@/lib/metrics/services/get-sentiment-metrics";

export const GET = createApiHandler(
  { queryParams: metricsReportQuerySchema },
  (params, ctx) => getSentimentMetrics({ ...params, projectId: ctx.projectId! }),
  { allowedRoles: [], minWorkspacePermission: "read", requireProject: true },
);
