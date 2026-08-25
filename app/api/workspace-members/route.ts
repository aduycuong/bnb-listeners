import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { addWorkspaceMemberFormSchema } from "@/lib/workspaces/schema";
import { addWorkspaceMember } from "@/lib/workspaces/services/add-workspace-member";
import { listWorkspaceMembers } from "@/lib/workspaces/services/list-workspace-members";

export const GET = createApiHandler(
  {},
  (_params, ctx) =>
    listWorkspaceMembers({
      workspaceId: ctx.workspaceId,
    }),
  {
    allowedRoles: ["user", "admin"],
    minWorkspacePermission: "read",
  },
);

export const POST = createApiHandler(
  {
    requestBody: addWorkspaceMemberFormSchema,
  },
  (params, ctx) =>
    addWorkspaceMember({
      workspaceId: ctx.workspaceId,
      grantedByUserId: ctx.userId,
      email: params.email,
      permission: params.permission,
    }),
  {
    allowedRoles: ["user", "admin"],
    minWorkspacePermission: "owner",
  },
);
