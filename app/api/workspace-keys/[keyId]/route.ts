import { z } from "zod";

import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { deleteWorkspaceKey } from "@/lib/unkey/services/delete-workspace-key";

const routeParamsSchema = z.object({
  keyId: z.string().uuid(),
});

export const DELETE = createApiHandler(
  { parameters: routeParamsSchema },
  (params, ctx) =>
    deleteWorkspaceKey({ workspaceId: ctx.workspaceId, keyId: params.keyId }),
  { allowedRoles: [], requireWorkspace: true, minWorkspacePermission: "edit" },
);
