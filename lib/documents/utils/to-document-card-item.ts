import type { DocumentCardItem, DocumentListItem } from "@/lib/documents/types";
import type { TermDocumentListItem } from "@/lib/terms/types";

export function toDocumentCardItem(doc: DocumentListItem): DocumentCardItem {
  return {
    id: doc.id,
    docType: doc.docType,
    title: doc.title,
    rawContent: doc.rawContent,
    sourceOriginName: doc.sourceOriginName,
    sourceItemId: doc.sourceItemId,
    embeddingStatus: doc.embeddingStatus,
    dataSourceName: doc.dataSourceName,
    publishedAt: doc.publishedAt,
    createdAt: doc.createdAt,
    qualityScore: doc.qualityScore,
    terms: doc.terms,
  };
}

export function toDocumentCardItemFromTermDocument(
  doc: TermDocumentListItem,
): DocumentCardItem {
  return {
    id: doc.id,
    docType: doc.docType,
    title: doc.title,
    rawContent: doc.rawContent,
    sourceOriginName: doc.sourceOriginName,
    sourceItemId: doc.sourceItemId,
    embeddingStatus: doc.embeddingStatus,
    dataSourceName: doc.dataSourceName,
    publishedAt: doc.publishedAt,
    createdAt: doc.createdAt,
    qualityScore: doc.qualityScore,
    terms: doc.terms,
    confidence: doc.confidence,
  };
}
