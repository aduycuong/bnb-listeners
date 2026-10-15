import { z } from "zod";

import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { mergeTopicBodySchema } from "@/lib/topics/schema";
import { mergeTopics } from "@/lib/topics/services/merge-topics";

const topicRouteParamsSchema = z.object({ id: z.uuid() });

export const POST = createApiHandler(
  { parameters: topicRouteParamsSchema, requestBody: mergeTopicBodySchema },
  (params, ctx) =>
    mergeTopics({ projectId: ctx.projectId!, sourceId: params.id, targetId: params.intoId }),
  { allowedRoles: [], minWorkspacePermission: "edit", requireProject: true },
);
