export type ChunkStrategy =
  | "chunk_markdown_by_heading"
  | "chunk_contract_by_article"
  | "chunk_tabular_data"
  | "chunk_slide_by_slide"
  | "chunk_qa_pairs"
  | "chunk_recursive_by_token";

export type DocumentChunkMetadata = {
  strategy: ChunkStrategy;
  headingPath?: string[];
  sectionTitle?: string;
  /** Index of the logical chunk this retrieval chunk was split from. */
  sourceChunkIndex?: number;
  /** Position within the parent logical chunk after splitting. */
  partIndex?: number;
  /** Total number of parts the parent logical chunk was split into. */
  partCount?: number;
};

export type DocumentChunk = {
  index: number;
  text: string;
  metadata: DocumentChunkMetadata;
};

export type NearDuplicateResult = {
  /** Whether a near-duplicate pair was detected. */
  hasMatch: boolean;
  /** ID of the older (original) document. null when no match. */
  canonicalId: string | null;
  /** ID of the newer (duplicate) document. null when no match. */
  duplicateId: string | null;
  /** Best observed avg cosine similarity (informational). */
  similarity: number | null;
};

export type EmbedChunksResult = {
  retrievalChunks: DocumentChunk[];
  vectors: number[][];
  strategy: ChunkStrategy;
  docType: string;
  createdAt: Date;
  publishedAt: Date | null;
};

export type StoreChunksParams = {
  documentId: string;
  retrievalChunks: DocumentChunk[];
  vectors: number[][];
  qualityScore: number;
  docType: string;
  publishedAt: Date | null;
};
