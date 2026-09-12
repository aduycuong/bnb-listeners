import { and, eq, inArray, sql } from "drizzle-orm";

import { termGroupMembers, termGroups, terms } from "@/db/schema";
import { db } from "@/lib/db";

import {
  MAX_GROUPS_PER_TERM,
  TERM_GROUP_ASSIGNED_BY,
} from "../term-group-config";

export type LlmTermGroupAssignment = {
  termId: string;
  groupIds: string[];
};

async function countTermGroupMemberships(termId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(termGroupMembers)
    .where(eq(termGroupMembers.termId, termId));

  return row?.count ?? 0;
}

/**
 * Insert LLM-suggested group memberships. Respects MAX_GROUPS_PER_TERM and
 * skips groups the term already belongs to.
 */
export async function applyLlmTermGroupAssignments(
  workspaceId: string,
  assignments: LlmTermGroupAssignment[],
): Promise<void> {
  if (assignments.length === 0) {
    return;
  }

  const termIds = [...new Set(assignments.map((item) => item.termId))];
  const groupIds = [
    ...new Set(assignments.flatMap((item) => item.groupIds)),
  ];

  if (groupIds.length === 0) {
    return;
  }

  const validTerms = await db
    .select({ id: terms.id })
    .from(terms)
    .where(
      and(
        eq(terms.workspaceId, workspaceId),
        inArray(terms.id, termIds),
      ),
    );

  const validTermIds = new Set(validTerms.map((row) => row.id));

  const validGroups = await db
    .select({ id: termGroups.id })
    .from(termGroups)
    .where(
      and(
        eq(termGroups.workspaceId, workspaceId),
        inArray(termGroups.id, groupIds),
      ),
    );

  const validGroupIds = new Set(validGroups.map((row) => row.id));

  const rowsToInsert: Array<{
    termGroupId: string;
    termId: string;
    assignedBy: string;
  }> = [];

  for (const assignment of assignments) {
    if (!validTermIds.has(assignment.termId)) {
      continue;
    }

    let membershipCount = await countTermGroupMemberships(assignment.termId);
    const existingGroups = await db
      .select({ termGroupId: termGroupMembers.termGroupId })
      .from(termGroupMembers)
      .where(eq(termGroupMembers.termId, assignment.termId));
    const existingGroupIds = new Set(
      existingGroups.map((row) => row.termGroupId),
    );

    for (const groupId of assignment.groupIds) {
      if (!validGroupIds.has(groupId)) {
        continue;
      }

      if (existingGroupIds.has(groupId)) {
        continue;
      }

      if (membershipCount >= MAX_GROUPS_PER_TERM) {
        break;
      }

      rowsToInsert.push({
        termGroupId: groupId,
        termId: assignment.termId,
        assignedBy: TERM_GROUP_ASSIGNED_BY.llmClassifier,
      });
      existingGroupIds.add(groupId);
      membershipCount += 1;
    }
  }

  if (rowsToInsert.length === 0) {
    return;
  }

  await db.insert(termGroupMembers).values(rowsToInsert).onConflictDoNothing();
}
