import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { createWorkspaceFormSchema } from "@/lib/workspaces/schema";
import { createWorkspace } from "@/lib/workspaces/services/create-workspace";
import { listWorkspacesForUser } from "@/lib/workspaces/services/list-workspaces-for-user";

export const GET = createApiHandler(
  {},
  (_params, ctx) =>
    listWorkspacesForUser({
      userId: ctx.userId,
    }),
  {
    allowedRoles: ["user", "admin"],
    requireWorkspace: false,
  },
);

export const POST = createApiHandler(
  {
    requestBody: createWorkspaceFormSchema,
  },
  (params, ctx) =>
    createWorkspace({
      ...params,
      userId: ctx.userId,
    }),
  {
    allowedRoles: ["user", "admin"],
    requireWorkspace: false,
  },
);
