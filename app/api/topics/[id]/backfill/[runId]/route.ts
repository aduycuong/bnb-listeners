import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { topicBackfillRunIdParamsSchema } from "@/lib/topic-backfill/schema";
import { getTopicBackfillRun } from "@/lib/topic-backfill/services/get-topic-backfill-run";

export const GET = createApiHandler(
  { parameters: topicBackfillRunIdParamsSchema },
  getTopicBackfillRun,
  { allowedRoles: [], minWorkspacePermission: "read" },
);
