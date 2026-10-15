import { z } from "zod";

import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { TOPIC_CONFIG } from "@/lib/topics/config";
import { getTopicReport } from "@/lib/topics/services/get-topic-report";

const topicReportQuerySchema = z.object({
  days: z.coerce
    .number()
    .int()
    .refine((days) => (TOPIC_CONFIG.reportPeriodDays as readonly number[]).includes(days))
    .default(TOPIC_CONFIG.reportPeriodDays[0]),
});

export const GET = createApiHandler(
  { queryParams: topicReportQuerySchema },
  (params, ctx) => getTopicReport({ ...params, projectId: ctx.projectId! }),
  { allowedRoles: [], minWorkspacePermission: "read", requireProject: true },
);
