import { and, eq, notExists, sql } from "drizzle-orm";

import { termGroupMembers, terms } from "@/db/schema";
import { db } from "@/lib/db";

import type { TermGroupMemberRebuildScanContext } from "../types";

export function buildRebuildScanConditions(
  context: TermGroupMemberRebuildScanContext,
) {
  const conditions = [eq(terms.workspaceId, context.workspaceId)];

  if (!context.includeAlreadyMembers) {
    conditions.push(
      notExists(
        db
          .select({ one: sql`1` })
          .from(termGroupMembers)
          .where(
            and(
              eq(termGroupMembers.termId, terms.id),
              eq(termGroupMembers.termGroupId, context.termGroupId),
            ),
          ),
      ),
    );
  }

  return conditions;
}

export async function countRebuildCandidates(
  context: TermGroupMemberRebuildScanContext,
): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(terms)
    .where(and(...buildRebuildScanConditions(context)));

  return row?.count ?? 0;
}
