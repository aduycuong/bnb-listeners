import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { workspaceKeyBodySchema } from "@/lib/unkey/schema";
import { createWorkspaceKey } from "@/lib/unkey/services/create-workspace-key";
import { listWorkspaceKeys } from "@/lib/unkey/services/list-workspace-keys";

export const GET = createApiHandler(
  {},
  (_params, ctx) => listWorkspaceKeys(ctx.workspaceId),
  { allowedRoles: [], requireWorkspace: true, minWorkspacePermission: "read" },
);

export const POST = createApiHandler(
  { requestBody: workspaceKeyBodySchema },
  (params, ctx) =>
    createWorkspaceKey({ ...params, workspaceId: ctx.workspaceId, userId: ctx.userId }),
  { allowedRoles: [], requireWorkspace: true, minWorkspacePermission: "edit" },
);
