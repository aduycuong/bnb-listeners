import { createHash } from "node:crypto";

/**
 * RFC 4122 UUID DNS namespace — used as the base for deriving per-workspace
 * unassigned group IDs via UUID v5 (SHA-1).
 */
const UNASSIGNED_GROUP_NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

/**
 * Derive the deterministic UUID v5 for the "Unassigned" source group of a
 * workspace.  The same workspace_id always produces the same ID, so callers
 * can check or create the row without querying first.
 *
 * Algorithm: UUID v5 = SHA-1(namespace_bytes || workspace_id) with version
 * and variant bits set per RFC 4122 §4.3.
 */
export function getUnassignedGroupId(workspaceId: string): string {
  const nsBytes = Buffer.from(UNASSIGNED_GROUP_NAMESPACE.replace(/-/g, ""), "hex");
  const hash = createHash("sha1")
    .update(nsBytes)
    .update(workspaceId)
    .digest();

  // Set version bits to 5 (0101) in octet 6
  hash[6] = (hash[6]! & 0x0f) | 0x50;
  // Set variant bits to 10xx in octet 8
  hash[8] = (hash[8]! & 0x3f) | 0x80;

  const hex = hash.subarray(0, 16).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}
