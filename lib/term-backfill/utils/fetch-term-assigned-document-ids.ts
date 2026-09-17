import { and, eq, inArray } from "drizzle-orm";

import { documentTerms } from "@/db/schema";
import { db } from "@/lib/db";

export async function fetchTermAssignedDocumentIds(params: {
  termId: string;
  documentIds: string[];
}): Promise<Set<string>> {
  if (params.documentIds.length === 0) {
    return new Set();
  }

  const rows = await db
    .select({ documentId: documentTerms.documentId })
    .from(documentTerms)
    .where(
      and(
        eq(documentTerms.termId, params.termId),
        inArray(documentTerms.documentId, params.documentIds),
      ),
    );

  return new Set(rows.map((row) => row.documentId));
}
