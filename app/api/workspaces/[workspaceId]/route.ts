import { z } from "zod";

import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { updateWorkspaceSettingsSchema } from "@/lib/workspaces/schema";
import { deleteWorkspace } from "@/lib/workspaces/services/delete-workspace";
import { updateWorkspace } from "@/lib/workspaces/services/update-workspace";

const workspaceIdRouteParamsSchema = z.object({
  workspaceId: z.uuid(),
});

export const PATCH = createApiHandler(
  {
    parameters: workspaceIdRouteParamsSchema,
    requestBody: updateWorkspaceSettingsSchema,
  },
  (params, ctx) =>
    updateWorkspace({
      workspaceId: ctx.workspaceId,
      topicScope: params.topicScope,
      topicLanguage: params.topicLanguage,
    }),
  {
    allowedRoles: ["user", "admin"],
    requireWorkspace: true,
    minWorkspacePermission: "edit",
  },
);

export const DELETE = createApiHandler(
  {
    parameters: workspaceIdRouteParamsSchema,
  },
  (_params, ctx) =>
    deleteWorkspace({
      userId: ctx.userId,
      workspaceId: ctx.workspaceId,
    }),
  {
    allowedRoles: ["user", "admin"],
    requireWorkspace: true,
    minWorkspacePermission: "owner",
  },
);
