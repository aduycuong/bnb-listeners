import { eq } from "drizzle-orm";

import { sourceGroups } from "@/db/schema";
import { db } from "@/lib/db";

import type { SourceGroupListItem } from "../types";
import { getNoGroupId, NO_GROUP_NAME } from "../utils/get-no-group-id";
import { toSourceGroupListItem } from "../utils/to-source-group-list-item";

/**
 * Create (or return) the workspace-scoped "No group" source group.
 *
 * Uses a deterministic UUID v5(workspace_id) so the same workspace always maps
 * to the same row ID without an extra schema column.
 */
export async function createNoGroupSourceGroup(
  workspaceId: string,
): Promise<SourceGroupListItem> {
  const id = getNoGroupId(workspaceId);

  const [existing] = await db
    .select()
    .from(sourceGroups)
    .where(eq(sourceGroups.id, id))
    .limit(1);

  if (existing) {
    if (existing.name !== NO_GROUP_NAME) {
      const [renamed] = await db
        .update(sourceGroups)
        .set({ name: NO_GROUP_NAME })
        .where(eq(sourceGroups.id, id))
        .returning();

      if (renamed) {
        return toSourceGroupListItem(renamed);
      }
    }

    return toSourceGroupListItem(existing);
  }

  await db
    .insert(sourceGroups)
    .values({
      id,
      workspaceId,
      name: NO_GROUP_NAME,
      description:
        "Default group for jobs and documents without an assigned source group.",
    })
    .onConflictDoNothing();

  const [created] = await db
    .select()
    .from(sourceGroups)
    .where(eq(sourceGroups.id, id))
    .limit(1);

  if (!created) {
    throw new Error("Failed to create No group source group for workspace.");
  }

  return toSourceGroupListItem(created);
}
