import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { mergeTopicsBodySchema } from "@/lib/topics/schema";
import { mergeTopics } from "@/lib/topics/services/merge-topics";

export const POST = createApiHandler(
  { requestBody: mergeTopicsBodySchema },
  mergeTopics,
  { allowedRoles: [], minWorkspacePermission: "edit" },
);
