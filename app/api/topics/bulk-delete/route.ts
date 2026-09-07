import { z } from "zod";

import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { bulkDeleteTopics } from "@/lib/topics/services/bulk-delete-topics";
import { TOPIC_BULK_DELETE_MAX } from "@/lib/topics/topic-config";

const bulkDeleteTopicsBodySchema = z.object({
  ids: z
    .array(z.uuid())
    .min(1, { error: "At least one topic id is required." })
    .max(TOPIC_BULK_DELETE_MAX, {
      error: `Cannot delete more than ${TOPIC_BULK_DELETE_MAX} topics at once.`,
    }),
});

export const POST = createApiHandler(
  { requestBody: bulkDeleteTopicsBodySchema },
  bulkDeleteTopics,
  { allowedRoles: [], minWorkspacePermission: "edit" },
);
