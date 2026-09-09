import { z } from "zod";

import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { topicBackfillEstimateBodySchema } from "@/lib/topic-backfill/schema";
import { estimateTopicBackfill } from "@/lib/topic-backfill/services/estimate-topic-backfill";

const topicIdSchema = z.object({ id: z.uuid() });

export const POST = createApiHandler(
  {
    parameters: topicIdSchema,
    requestBody: topicBackfillEstimateBodySchema,
  },
  estimateTopicBackfill,
  { allowedRoles: [], minWorkspacePermission: "edit" },
);
