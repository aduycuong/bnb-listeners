import { eq, inArray } from "drizzle-orm";

import { termGroupMembers } from "@/db/schema";
import { db } from "@/lib/db";

import { MAX_GROUPS_PER_TERM } from "../term-group-config";

/**
 * Copy group memberships from source terms onto the merge target before sources
 * are deleted. Skips groups the target already belongs to and respects
 * MAX_GROUPS_PER_TERM.
 */
export async function transferTermGroupMemberships(
  sourceTermIds: string[],
  targetTermId: string,
): Promise<void> {
  if (sourceTermIds.length === 0) {
    return;
  }

  const sourceRows = await db
    .select({
      termGroupId: termGroupMembers.termGroupId,
      assignedBy: termGroupMembers.assignedBy,
    })
    .from(termGroupMembers)
    .where(inArray(termGroupMembers.termId, sourceTermIds));

  if (sourceRows.length === 0) {
    return;
  }

  const targetRows = await db
    .select({ termGroupId: termGroupMembers.termGroupId })
    .from(termGroupMembers)
    .where(eq(termGroupMembers.termId, targetTermId));

  const targetGroupIds = new Set(targetRows.map((row) => row.termGroupId));
  const seenSourceGroups = new Set<string>();
  const slotsLeft = Math.max(0, MAX_GROUPS_PER_TERM - targetGroupIds.size);

  if (slotsLeft === 0) {
    return;
  }

  const toInsert: Array<{
    termGroupId: string;
    termId: string;
    assignedBy: string;
  }> = [];

  for (const row of sourceRows) {
    if (targetGroupIds.has(row.termGroupId)) {
      continue;
    }

    if (seenSourceGroups.has(row.termGroupId)) {
      continue;
    }

    seenSourceGroups.add(row.termGroupId);
    toInsert.push({
      termGroupId: row.termGroupId,
      termId: targetTermId,
      assignedBy: row.assignedBy,
    });

    if (toInsert.length >= slotsLeft) {
      break;
    }
  }

  if (toInsert.length === 0) {
    return;
  }

  await db.insert(termGroupMembers).values(toInsert).onConflictDoNothing();
}
