import { and, asc, eq } from "drizzle-orm";

import { documentParts } from "@/db/schema";
import { db } from "@/lib/db";

import type { DocumentPartRow } from "../types";
import { toDocumentPartRow } from "../utils/to-document-part-row";

/**
 * Parts that passed both score thresholds, in part order. Shared by the
 * classifier (builds its context from these) and the chunker (only these
 * become chunks).
 */
export async function getEligibleDocumentParts(
  documentId: string,
): Promise<DocumentPartRow[]> {
  const rows = await db
    .select()
    .from(documentParts)
    .where(
      and(
        eq(documentParts.documentId, documentId),
        eq(documentParts.isEligible, true),
      ),
    )
    .orderBy(asc(documentParts.partIndex));

  return rows.map(toDocumentPartRow);
}
