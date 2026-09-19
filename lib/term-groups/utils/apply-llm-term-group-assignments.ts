import { and, eq, inArray, sql } from "drizzle-orm";

import { termGroupMembers, termGroups, terms } from "@/db/schema";
import { db } from "@/lib/db";

import {
  MAX_GROUPS_PER_TERM,
  TERM_GROUP_ASSIGNED_BY,
} from "../term-group-config";
import type { TermGroupMembershipEvaluation } from "./evaluate-terms-for-term-groups";

async function countTermGroupMemberships(termId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(termGroupMembers)
    .where(eq(termGroupMembers.termId, termId));

  return row?.count ?? 0;
}

/**
 * Insert LLM-evaluated group memberships for freshly created terms.
 *
 * Mirrors the member rebuild apply step: drops memberships below
 * `confidenceMin`, respects MAX_GROUPS_PER_TERM, and skips groups the term
 * already belongs to. Never removes existing memberships.
 */
export async function applyLlmTermGroupAssignments(params: {
  workspaceId: string;
  evaluations: TermGroupMembershipEvaluation[];
  confidenceMin: number;
}): Promise<void> {
  const accepted = params.evaluations.filter(
    (item) => item.confidence >= params.confidenceMin,
  );

  if (accepted.length === 0) {
    return;
  }

  const termIds = [...new Set(accepted.map((item) => item.termId))];
  const groupIds = [...new Set(accepted.map((item) => item.groupId))];

  const validTerms = await db
    .select({ id: terms.id })
    .from(terms)
    .where(
      and(
        eq(terms.workspaceId, params.workspaceId),
        inArray(terms.id, termIds),
      ),
    );

  const validTermIds = new Set(validTerms.map((row) => row.id));

  const validGroups = await db
    .select({ id: termGroups.id })
    .from(termGroups)
    .where(
      and(
        eq(termGroups.workspaceId, params.workspaceId),
        inArray(termGroups.id, groupIds),
      ),
    );

  const validGroupIds = new Set(validGroups.map((row) => row.id));

  // Highest confidence first so the MAX_GROUPS_PER_TERM cap keeps the best fits.
  const byTerm = new Map<string, TermGroupMembershipEvaluation[]>();
  for (const item of accepted) {
    if (!validTermIds.has(item.termId) || !validGroupIds.has(item.groupId)) {
      continue;
    }

    const list = byTerm.get(item.termId) ?? [];
    list.push(item);
    byTerm.set(item.termId, list);
  }

  const rowsToInsert: Array<{
    termGroupId: string;
    termId: string;
    assignedBy: string;
  }> = [];

  for (const [termId, items] of byTerm) {
    let membershipCount = await countTermGroupMemberships(termId);
    const existingGroups = await db
      .select({ termGroupId: termGroupMembers.termGroupId })
      .from(termGroupMembers)
      .where(eq(termGroupMembers.termId, termId));
    const existingGroupIds = new Set(
      existingGroups.map((row) => row.termGroupId),
    );

    const sorted = [...items].sort((a, b) => b.confidence - a.confidence);

    for (const item of sorted) {
      if (existingGroupIds.has(item.groupId)) {
        continue;
      }

      if (membershipCount >= MAX_GROUPS_PER_TERM) {
        break;
      }

      rowsToInsert.push({
        termGroupId: item.groupId,
        termId,
        assignedBy: TERM_GROUP_ASSIGNED_BY.llmClassifier,
      });
      existingGroupIds.add(item.groupId);
      membershipCount += 1;
    }
  }

  if (rowsToInsert.length === 0) {
    return;
  }

  await db.insert(termGroupMembers).values(rowsToInsert).onConflictDoNothing();
}
