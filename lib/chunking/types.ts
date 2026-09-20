export type RebuildDocumentChunksParams = {
  documentId: string;
};

export type RebuildDocumentChunksResult = {
  documentId: string;
  /** Parts that passed both score thresholds and were offered to the chunker. */
  eligibleParts: number;
  chunksCreated: number;
  textChunks: number;
  mediaChunks: number;
};

export type DeleteDocumentChunksParams = {
  documentId: string;
};

export type DeleteDocumentChunksResult = {
  documentId: string;
  deleted: number;
};

export type ListDocumentChunksParams = {
  id: string;
};

export type DocumentChunkListItem = {
  id: string;
  partId: string | null;
  chunkIndex: number;
  content: string;
  contentType: string;
  mediaUrl: string | null;
  metadata: Record<string, unknown>;
  mediaMetadata: Record<string, unknown> | null;
  createdAt: string;
};

export type ListDocumentChunksResult = {
  items: DocumentChunkListItem[];
  total: number;
};

export type SearchDocumentChunksParams = {
  id: string;
  query: string;
  limit?: number;
};

export type SearchDocumentChunkItem = {
  id: string;
  chunkIndex: number;
  content: string;
  qualityScore: number;
  rrfScore: number;
  similarityScore: number;
  multimodalSimilarityScore: number | null;
  ftsScore: number | null;
};

export type SearchDocumentChunksResult = {
  query: string;
  items: SearchDocumentChunkItem[];
};
