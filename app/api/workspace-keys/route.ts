import { z } from "zod";

import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { createWorkspaceKey } from "@/lib/unkey/services/create-workspace-key";
import { listWorkspaceKeys } from "@/lib/unkey/services/list-workspace-keys";

const createKeyBodySchema = z.object({
  name: z.string().min(1, "Name is required").max(64, "Name must be 64 characters or fewer"),
});

export const GET = createApiHandler(
  {},
  (_params, ctx) => listWorkspaceKeys(ctx.workspaceId),
  { allowedRoles: [], requireWorkspace: true, minWorkspacePermission: "read" },
);

export const POST = createApiHandler(
  { requestBody: createKeyBodySchema },
  (params, ctx) =>
    createWorkspaceKey({ workspaceId: ctx.workspaceId, name: params.name }),
  { allowedRoles: [], requireWorkspace: true, minWorkspacePermission: "edit" },
);
