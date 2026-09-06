import { createHash } from "node:crypto";

/**
 * RFC 4122 UUID DNS namespace — used as the base for deriving per-workspace
 * "No group" source group IDs via UUID v5 (SHA-1).
 */
const NO_GROUP_NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

export const NO_GROUP_NAME = "No group";

/**
 * Derive the deterministic UUID v5 for the workspace-scoped "No group" source
 * group. The same workspace_id always produces the same ID.
 */
export function getNoGroupId(workspaceId: string): string {
  const nsBytes = Buffer.from(NO_GROUP_NAMESPACE.replace(/-/g, ""), "hex");
  const hash = createHash("sha1")
    .update(nsBytes)
    .update(workspaceId)
    .digest();

  hash[6] = (hash[6]! & 0x0f) | 0x50;
  hash[8] = (hash[8]! & 0x3f) | 0x80;

  const hex = hash.subarray(0, 16).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}
