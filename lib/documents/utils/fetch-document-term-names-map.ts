import { asc, eq, inArray } from "drizzle-orm";

import { documentTerms, terms } from "@/db/schema";
import { db } from "@/lib/db";

import type { DocumentTermSummary } from "../types";

export async function fetchDocumentTermNamesMap(
  documentIds: string[],
): Promise<Map<string, DocumentTermSummary[]>> {
  const map = new Map<string, DocumentTermSummary[]>();

  if (documentIds.length === 0) {
    return map;
  }

  const rows = await db
    .select({
      documentId: documentTerms.documentId,
      id: terms.id,
      name: terms.name,
    })
    .from(documentTerms)
    .innerJoin(terms, eq(documentTerms.termId, terms.id))
    .where(inArray(documentTerms.documentId, documentIds))
    .orderBy(asc(terms.name));

  for (const row of rows) {
    const current = map.get(row.documentId) ?? [];
    current.push({ id: row.id, name: row.name });
    map.set(row.documentId, current);
  }

  return map;
}
