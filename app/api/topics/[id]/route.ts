import { z } from "zod";

import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { updateTopicBodySchema } from "@/lib/topics/schema";
import { updateTopic } from "@/lib/topics/services/update-topic";

const topicRouteParamsSchema = z.object({ id: z.uuid() });

export const PATCH = createApiHandler(
  { parameters: topicRouteParamsSchema, requestBody: updateTopicBodySchema },
  (params, ctx) =>
    updateTopic({
      projectId: ctx.projectId!,
      topicId: params.id,
      name: params.name,
      description: params.description,
      status: params.status,
    }),
  { allowedRoles: [], minWorkspacePermission: "edit", requireProject: true },
);
