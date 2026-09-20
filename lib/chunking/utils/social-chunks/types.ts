import type { SOCIAL_CONTENT_STRATEGY } from "./config";

export type MediaKind = "image" | "video";

export type ChunkContentType = "text" | MediaKind;

/**
 * Source context prepended to every chunk before embedding, so a chunk lifted
 * out of its document still says who posted it and where.
 */
export type ChunkSourceContext = {
  author?: string | null;
  sourceOriginName?: string | null;
  /** Extra labels appended to the context line, e.g. ["thắc mắc", "Đà Lạt"]. */
  labels?: string[];
};

/**
 * One eligible document part, reduced to what the chunker needs.
 * `text` is the body for text parts and the LLM summary for media parts.
 */
export type ChunkablePart = {
  partId: string;
  partIndex: number;
  contentType: ChunkContentType;
  text: string;
  /** Stable media URL (R2). Null for text parts. */
  mediaUrl: string | null;
  /** Original scraped URL, kept for reference in media_metadata. */
  sourceUrl: string | null;
  partScore: number;
};

export type CreateChunksParams = {
  parts: ChunkablePart[];
  context?: ChunkSourceContext;
  /** Overrides ATOMIC_MAX_CHARACTERS. */
  atomicMaxCharacters?: number;
};

export type CreatedChunkMetadata = {
  strategy: typeof SOCIAL_CONTENT_STRATEGY;
  contentType: ChunkContentType;
  hasContextPrefix: boolean;
  /** document_parts.part_index this chunk was built from. */
  partIndex: number;
  /** Position within the split text part. Text chunks only. */
  splitIndex?: number;
  /** Total pieces the text part was split into. Text chunks only. */
  splitCount?: number;
};

export type CreatedChunkMediaMetadata = {
  kind: MediaKind;
  url: string;
  sourceUrl: string | null;
};

/** Maps 1:1 onto a `chunks` row, minus `documentId` and the embedding columns. */
export type CreatedChunk = {
  chunkIndex: number;
  partId: string;
  partScore: number;
  content: string;
  contentType: ChunkContentType;
  mediaUrl: string | null;
  mediaMetadata: CreatedChunkMediaMetadata | null;
  metadata: CreatedChunkMetadata;
};

/** One interleaved text + media input for the multimodal embedding model. */
export type MultimodalEmbedInput = {
  text: string;
  mediaUrl: string;
  kind: MediaKind;
};

export type CreateChunkRecordsParams = {
  documentId: string;
  docType: string;
  publishedAt: Date | null;
  chunks: CreatedChunk[];
};
