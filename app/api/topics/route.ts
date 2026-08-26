import { z } from "zod";

import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { createTopicBodySchema } from "@/lib/topics/schema";
import { createTopic } from "@/lib/topics/services/create-topic";
import { listTopics } from "@/lib/topics/services/list-topics";

const listTopicsQuerySchema = z.object({
  verified: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === "true")),
});

export const GET = createApiHandler(
  { queryParams: listTopicsQuerySchema },
  (params, ctx) => listTopics({ verified: params.verified }, ctx),
  {
    allowedRoles: [],
    minWorkspacePermission: "read",
  },
);

export const POST = createApiHandler(
  { requestBody: createTopicBodySchema },
  createTopic,
  { allowedRoles: [], minWorkspacePermission: "edit" },
);
