import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { metricsReportQuerySchema } from "@/lib/metrics/schema";
import { getBrandCaseMetrics } from "@/lib/metrics/services/get-brand-case-metrics";

export const GET = createApiHandler(
  { queryParams: metricsReportQuerySchema },
  (params, ctx) => getBrandCaseMetrics({ ...params, projectId: ctx.projectId! }),
  { allowedRoles: [], minWorkspacePermission: "read", requireProject: true },
);
