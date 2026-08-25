import { z } from "zod";

import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { removeWorkspaceMember } from "@/lib/workspaces/services/remove-workspace-member";

const removeWorkspaceMemberRouteParamsSchema = z.object({
  userId: z.uuid(),
});

export const DELETE = createApiHandler(
  {
    parameters: removeWorkspaceMemberRouteParamsSchema,
  },
  (params, ctx) =>
    removeWorkspaceMember({
      workspaceId: ctx.workspaceId,
      userId: params.userId,
    }),
  {
    allowedRoles: ["user", "admin"],
    minWorkspacePermission: "owner",
  },
);
