import { and, eq, inArray } from "drizzle-orm";

import { termGroupMembers } from "@/db/schema";
import { db } from "@/lib/db";

import type { RebuildTermRow } from "./fetch-rebuild-term-batch";

export async function filterTermsForRebuildEvaluation(params: {
  termGroupId: string;
  terms: RebuildTermRow[];
  includeAlreadyMembers: boolean;
}): Promise<RebuildTermRow[]> {
  if (params.terms.length === 0) {
    return [];
  }

  if (params.includeAlreadyMembers) {
    return params.terms;
  }

  const termIds = params.terms.map((term) => term.id);
  const memberRows = await db
    .select({ termId: termGroupMembers.termId })
    .from(termGroupMembers)
    .where(
      and(
        eq(termGroupMembers.termGroupId, params.termGroupId),
        inArray(termGroupMembers.termId, termIds),
      ),
    );

  const memberIds = new Set(memberRows.map((row) => row.termId));

  return params.terms.filter((term) => !memberIds.has(term.id));
}
