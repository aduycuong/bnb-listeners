import { and, eq } from "drizzle-orm";

import { workspaceMembers, workspaces } from "@/db/schema";
import { db } from "@/lib/db";

import {
  WORKSPACE_PERMISSION_CACHE_TTL_MS,
  type WorkspacePermission,
} from "../constants";

type CacheEntry = {
  permission: WorkspacePermission | null;
  expiresAt: number;
};

const permissionCache = new Map<string, CacheEntry>();

function getCacheKey(userId: string, workspaceId: string): string {
  return `${userId}:${workspaceId}`;
}

export function invalidateWorkspacePermissionCache(params: {
  workspaceId: string;
  userId?: string;
}): void {
  if (params.userId) {
    permissionCache.delete(getCacheKey(params.userId, params.workspaceId));
    return;
  }

  for (const key of permissionCache.keys()) {
    if (key.endsWith(`:${params.workspaceId}`)) {
      permissionCache.delete(key);
    }
  }
}

export async function resolveWorkspacePermission(params: {
  userId: string;
  workspaceId: string;
}): Promise<WorkspacePermission | null> {
  const cacheKey = getCacheKey(params.userId, params.workspaceId);
  const now = Date.now();
  const cached = permissionCache.get(cacheKey);

  if (cached && cached.expiresAt > now) {
    return cached.permission;
  }

  const [workspace] = await db
    .select({ ownerUserId: workspaces.ownerUserId })
    .from(workspaces)
    .where(eq(workspaces.id, params.workspaceId))
    .limit(1);

  if (!workspace) {
    permissionCache.set(cacheKey, {
      permission: null,
      expiresAt: now + WORKSPACE_PERMISSION_CACHE_TTL_MS,
    });
    return null;
  }

  if (workspace.ownerUserId === params.userId) {
    permissionCache.set(cacheKey, {
      permission: "owner",
      expiresAt: now + WORKSPACE_PERMISSION_CACHE_TTL_MS,
    });
    return "owner";
  }

  const [member] = await db
    .select({ permission: workspaceMembers.permission })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, params.workspaceId),
        eq(workspaceMembers.userId, params.userId),
      ),
    )
    .limit(1);

  const permission =
    (member?.permission as WorkspacePermission | undefined) ?? null;

  permissionCache.set(cacheKey, {
    permission,
    expiresAt: now + WORKSPACE_PERMISSION_CACHE_TTL_MS,
  });

  return permission;
}
