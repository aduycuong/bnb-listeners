import { z } from "zod";

import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { workspaceKeyBodySchema } from "@/lib/unkey/schema";
import { deleteWorkspaceKey } from "@/lib/unkey/services/delete-workspace-key";
import { updateWorkspaceKey } from "@/lib/unkey/services/update-workspace-key";

const routeParamsSchema = z.object({
  keyId: z.string().uuid(),
});

export const PATCH = createApiHandler(
  { parameters: routeParamsSchema, requestBody: workspaceKeyBodySchema },
  (params, ctx) => updateWorkspaceKey({ ...params, workspaceId: ctx.workspaceId }),
  { allowedRoles: [], requireWorkspace: true, minWorkspacePermission: "edit" },
);

export const DELETE = createApiHandler(
  { parameters: routeParamsSchema },
  (params, ctx) =>
    deleteWorkspaceKey({ workspaceId: ctx.workspaceId, keyId: params.keyId }),
  { allowedRoles: [], requireWorkspace: true, minWorkspacePermission: "edit" },
);
