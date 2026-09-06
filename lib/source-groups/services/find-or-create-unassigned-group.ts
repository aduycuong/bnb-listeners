import { eq } from "drizzle-orm";

import { sourceGroups } from "@/db/schema";
import { db } from "@/lib/db";

import type { SourceGroupListItem } from "../types";
import { getUnassignedGroupId } from "../utils/get-unassigned-group-id";
import { toSourceGroupListItem } from "../utils/to-source-group-list-item";

/**
 * Find the workspace-scoped "Unassigned" group, creating it on demand if it
 * does not yet exist.
 *
 * The group's UUID is deterministic: UUID v5(namespace, workspace_id), so the
 * same workspace always maps to the same ID.  No extra column is needed on the
 * table.
 *
 * Used by `deleteSourceGroup` when no move target is specified.
 */
export async function findOrCreateUnassignedGroup(
  workspaceId: string,
): Promise<SourceGroupListItem> {
  const id = getUnassignedGroupId(workspaceId);

  const [existing] = await db
    .select()
    .from(sourceGroups)
    .where(eq(sourceGroups.id, id))
    .limit(1);

  if (existing) {
    return toSourceGroupListItem(existing);
  }

  // Insert with the deterministic ID; tolerate a concurrent race via
  // onConflictDoNothing + re-read.
  await db
    .insert(sourceGroups)
    .values({
      id,
      workspaceId,
      name: "Unassigned",
      description: "Auto-created group for jobs and documents without an assigned group.",
    })
    .onConflictDoNothing();

  const [created] = await db
    .select()
    .from(sourceGroups)
    .where(eq(sourceGroups.id, id))
    .limit(1);

  if (!created) {
    throw new Error("Failed to create unassigned group for workspace.");
  }

  return toSourceGroupListItem(created);
}
