import { z } from "zod";

import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { deleteWorkspace } from "@/lib/workspaces/services/delete-workspace";

const deleteWorkspaceRouteParamsSchema = z.object({
  workspaceId: z.uuid(),
});

export const DELETE = createApiHandler(
  {
    parameters: deleteWorkspaceRouteParamsSchema,
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
