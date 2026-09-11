import { and, eq, gte } from "drizzle-orm";

import { documentTerms } from "@/db/schema";
import { DOCUMENT_TERM_ASSIGNED_BY } from "@/lib/document-terms/document-term-config";
import { db } from "@/lib/db";

export async function fetchBackfillAssignedDocumentIds(params: {
  termId: string;
  startedAt: Date;
}): Promise<string[]> {
  const rows = await db
    .select({ documentId: documentTerms.documentId })
    .from(documentTerms)
    .where(
      and(
        eq(documentTerms.termId, params.termId),
        eq(documentTerms.assignedBy, DOCUMENT_TERM_ASSIGNED_BY.termBackfill),
        gte(documentTerms.assignedAt, params.startedAt),
      ),
    );

  return rows.map((row) => row.documentId);
}
