import { z } from "zod";

import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { updateTopicBodySchema } from "@/lib/topics/schema";
import { deleteTopic } from "@/lib/topics/services/delete-topic";
import { updateTopic } from "@/lib/topics/services/update-topic";

const topicIdSchema = z.object({ id: z.uuid() });

export const PATCH = createApiHandler(
  { parameters: topicIdSchema, requestBody: updateTopicBodySchema },
  updateTopic,
  { allowedRoles: [], minWorkspacePermission: "edit" },
);

export const DELETE = createApiHandler(
  { parameters: topicIdSchema },
  deleteTopic,
  { allowedRoles: [], minWorkspacePermission: "edit" },
);
