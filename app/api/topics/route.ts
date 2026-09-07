import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { createTopicBodySchema } from "@/lib/topics/schema";
import { createTopic } from "@/lib/topics/services/create-topic";
import { listTopics } from "@/lib/topics/services/list-topics";

export const GET = createApiHandler({}, (_params, ctx) => listTopics({}, ctx), {
  allowedRoles: [],
  minWorkspacePermission: "read",
});

export const POST = createApiHandler(
  { requestBody: createTopicBodySchema },
  createTopic,
  { allowedRoles: [], minWorkspacePermission: "edit" },
);
