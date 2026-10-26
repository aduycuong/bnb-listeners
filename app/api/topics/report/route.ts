import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { metricsReportQuerySchema } from "@/lib/metrics/schema";
import { getTopicReport } from "@/lib/topics/services/get-topic-report";

/** Topics report over the same periods as the other reports; growth compares with the days before. */
export const GET = createApiHandler(
  { queryParams: metricsReportQuerySchema },
  (params, ctx) => getTopicReport({ ...params, projectId: ctx.projectId! }),
  { allowedRoles: [], minWorkspacePermission: "read", requireProject: true },
);
