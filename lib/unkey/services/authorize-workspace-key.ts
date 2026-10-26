import { eq } from "drizzle-orm";

import { workspaceApiKeys, workspaces } from "@/db/schema";
import { db } from "@/lib/db";
import { APIError } from "@/lib/exposers/api-error";
import { assertWorkspaceAccess } from "@/lib/workspaces/services/assert-workspace-access";

import type { AuthorizedWorkspaceKey } from "../types";
import { toWorkspaceKeyScopes } from "../utils/to-workspace-key-item";
import { verifyWorkspaceKey } from "./verify-workspace-key";

function unauthorized(message: string) {
  return new APIError("Unauthorized", message, 401);
}

/**
 * Verifies a raw key with Unkey, then reads what it may do from `workspace_api_keys` (D27).
 * Calls run as the key's creator, who must still be a member of the workspace; keys made
 * before D27 have no creator and run as the workspace owner.
 */
export async function authorizeWorkspaceKey(rawKey: string): Promise<AuthorizedWorkspaceKey> {
  const verification = await verifyWorkspaceKey(rawKey);
  if (!verification.valid) throw unauthorized(verification.reason);

  const [row] = await db
    .select({ key: workspaceApiKeys, ownerUserId: workspaces.ownerUserId })
    .from(workspaceApiKeys)
    .innerJoin(workspaces, eq(workspaces.id, workspaceApiKeys.workspaceId))
    .where(eq(workspaceApiKeys.unkeyKeyId, verification.unkeyKeyId))
    .limit(1);
  if (!row || row.key.workspaceId !== verification.workspaceId) {
    throw unauthorized("KEY_NOT_FOUND");
  }

  const userId = row.key.createdBy ?? row.ownerUserId;
  try {
    await assertWorkspaceAccess({ userId, workspaceId: row.key.workspaceId, minPermission: "read" });
  } catch {
    throw unauthorized("KEY_OWNER_LEFT_WORKSPACE");
  }

  return {
    keyId: row.key.id,
    workspaceId: row.key.workspaceId,
    userId,
    scopes: toWorkspaceKeyScopes(row.key.scopes),
    projectIds: row.key.projectIds,
  };
}
