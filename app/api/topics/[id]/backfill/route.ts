import { z } from "zod";

import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { topicBackfillCreateBodySchema } from "@/lib/topic-backfill/schema";
import { createTopicBackfillRun } from "@/lib/topic-backfill/services/create-topic-backfill-run";

const topicIdSchema = z.object({ id: z.uuid() });

export const POST = createApiHandler(
  {
    parameters: topicIdSchema,
    requestBody: topicBackfillCreateBodySchema,
  },
  createTopicBackfillRun,
  { allowedRoles: [], minWorkspacePermission: "edit" },
);
