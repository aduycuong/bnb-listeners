import type { WorkspacePermission } from "../constants";

const PERMISSION_RANK: Record<WorkspacePermission, number> = {
  read: 1,
  edit: 2,
  owner: 3,
};

export function hasMinWorkspacePermission(
  actual: WorkspacePermission,
  required: WorkspacePermission,
): boolean {
  return PERMISSION_RANK[actual] >= PERMISSION_RANK[required];
}
