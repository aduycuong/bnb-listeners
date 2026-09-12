import { and, eq, inArray, sql } from "drizzle-orm";

import { termGroupMembers, terms } from "@/db/schema";
import { db } from "@/lib/db";
import {
  MAX_GROUPS_PER_TERM,
  TERM_GROUP_ASSIGNED_BY,
} from "@/lib/term-groups/term-group-config";

import type { TermGroupEvaluation } from "./evaluate-terms-for-term-group";

async function countTermGroupMemberships(termId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(termGroupMembers)
    .where(eq(termGroupMembers.termId, termId));

  return row?.count ?? 0;
}

export type ApplyTermGroupMemberEvaluationsResult = {
  matched: number;
  removed: number;
};

export async function applyTermGroupMemberEvaluations(params: {
  workspaceId: string;
  termGroupId: string;
  evaluations: TermGroupEvaluation[];
  confidenceMin: number;
  removeNonMatching: boolean;
}): Promise<ApplyTermGroupMemberEvaluationsResult> {
  if (params.evaluations.length === 0) {
    return { matched: 0, removed: 0 };
  }

  const termIds = params.evaluations.map((item) => item.termId);
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
  const existingMembers = await db
    .select({ termId: termGroupMembers.termId })
    .from(termGroupMembers)
    .where(eq(termGroupMembers.termGroupId, params.termGroupId));
  const existingMemberIds = new Set(existingMembers.map((row) => row.termId));

  const rowsToInsert: Array<{
    termGroupId: string;
    termId: string;
    assignedBy: string;
  }> = [];
  const termIdsToRemove: string[] = [];
  let matched = 0;
  let removed = 0;

  for (const evaluation of params.evaluations) {
    if (!validTermIds.has(evaluation.termId)) {
      continue;
    }

    const belongs =
      evaluation.belongs && evaluation.confidence >= params.confidenceMin;
    const isMember = existingMemberIds.has(evaluation.termId);

    if (belongs) {
      if (isMember) {
        continue;
      }

      const membershipCount = await countTermGroupMemberships(evaluation.termId);
      if (membershipCount >= MAX_GROUPS_PER_TERM) {
        continue;
      }

      rowsToInsert.push({
        termGroupId: params.termGroupId,
        termId: evaluation.termId,
        assignedBy: TERM_GROUP_ASSIGNED_BY.memberRebuild,
      });
      existingMemberIds.add(evaluation.termId);
      matched += 1;
      continue;
    }

    if (
      params.removeNonMatching &&
      isMember &&
      evaluation.confidence >= params.confidenceMin
    ) {
      termIdsToRemove.push(evaluation.termId);
      existingMemberIds.delete(evaluation.termId);
      removed += 1;
    }
  }

  if (rowsToInsert.length > 0) {
    await db.insert(termGroupMembers).values(rowsToInsert).onConflictDoNothing();
  }

  if (termIdsToRemove.length > 0) {
    await db
      .delete(termGroupMembers)
      .where(
        and(
          eq(termGroupMembers.termGroupId, params.termGroupId),
          inArray(termGroupMembers.termId, termIdsToRemove),
        ),
      );
  }

  return { matched, removed };
}
