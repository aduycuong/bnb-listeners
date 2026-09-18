import type { DocumentPart } from "@/db/schema";

import type {
  DocumentPartContentType,
  DocumentPartRow,
  DocumentPartScoreSource,
} from "../types";

/** Narrows the loosely-typed text columns from the DB row to the domain unions. */
export function toDocumentPartRow(row: DocumentPart): DocumentPartRow {
  return {
    id: row.id,
    documentId: row.documentId,
    partIndex: row.partIndex,
    contentType: row.contentType as DocumentPartContentType,
    value: row.value,
    storageKey: row.storageKey,
    storageUrl: row.storageUrl,
    relevanceScore: row.relevanceScore,
    detailScore: row.detailScore,
    partScore: row.partScore,
    summary: row.summary,
    isEligible: row.isEligible,
    scoreSource: row.scoreSource as DocumentPartScoreSource | null,
    scoreError: row.scoreError,
    metadata: row.metadata,
    scoredAt: row.scoredAt,
    createdAt: row.createdAt,
  };
}
