import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { topicBackfillRunIdParamsSchema } from "@/lib/topic-backfill/schema";
import { cancelTopicBackfillRun } from "@/lib/topic-backfill/services/cancel-topic-backfill-run";

export const POST = createApiHandler(
  { parameters: topicBackfillRunIdParamsSchema },
  cancelTopicBackfillRun,
  { allowedRoles: [], minWorkspacePermission: "edit" },
);
