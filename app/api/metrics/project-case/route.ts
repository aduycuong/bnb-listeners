import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { metricsReportQuerySchema } from "@/lib/metrics/schema";
import { getProjectCaseMetrics } from "@/lib/metrics/services/get-project-case-metrics";

export const GET = createApiHandler(
  { queryParams: metricsReportQuerySchema },
  (params, ctx) => getProjectCaseMetrics({ ...params, projectId: ctx.projectId! }),
  { allowedRoles: [], minWorkspacePermission: "read", requireProject: true },
);
