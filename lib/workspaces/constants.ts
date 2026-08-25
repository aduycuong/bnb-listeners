export const X_WORKSPACE_ID_HEADER = "x-workspace-id";

export const WORKSPACE_PERMISSIONS = ["read", "edit", "owner"] as const;

export type WorkspacePermission = (typeof WORKSPACE_PERMISSIONS)[number];

export const WORKSPACE_PERMISSION_CACHE_TTL_MS = 60 * 1000;

export const DEFAULT_WORKSPACE_NAME = "My workspace";

export const DEFAULT_WORKSPACE_INDEX = 0;

export const WORKSPACE_INDEX_STORAGE_KEY = "workspace-index";
