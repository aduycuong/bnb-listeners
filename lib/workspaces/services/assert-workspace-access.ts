import { APIError } from "@/lib/exposers/api-error";

import type { WorkspacePermission } from "../constants";
import { hasMinWorkspacePermission } from "../utils/permission-rank";
import { resolveWorkspacePermission } from "./resolve-workspace-permission";

export async function assertWorkspaceAccess(params: {
  userId: string;
  workspaceId: string;
  minPermission?: WorkspacePermission;
}): Promise<WorkspacePermission> {
  const permission = await resolveWorkspacePermission({
    userId: params.userId,
    workspaceId: params.workspaceId,
  });

  if (!permission) {
    throw new APIError("ERR_NOT_FOUND", "Workspace not found.", 404);
  }

  const minPermission = params.minPermission ?? "read";

  if (!hasMinWorkspacePermission(permission, minPermission)) {
    throw new APIError("ERR_NOT_FOUND", "Workspace not found.", 404);
  }

  return permission;
}
