import type { EngagementCounts } from "@/lib/common/engagement-counts";

import type { SOCIAL_CONTENT_STRATEGY } from "./config";

export type MediaKind = "image" | "video";

export type ChunkContentType = "text" | MediaKind;

/**
 * Source context prepended to every chunk before embedding, so a chunk lifted
 * out of its document still says who posted it, where, and when.
 */
export type ChunkSourceContext = {
  author?: string | null;
  sourceName?: string | null;
  publishedAt?: Date | string | null;
  /** Extra labels appended to the context line, e.g. ["thắc mắc", "Đà Lạt"]. */
  labels?: string[];
};

export type CreateChunksParams = {
  content: string;
  imageUrls?: string[];
  videoUrls?: string[];
  context?: ChunkSourceContext;
  /** Overrides ATOMIC_MAX_CHARACTERS. */
  atomicMaxCharacters?: number;
  /** Overrides MAX_MEDIA_PER_KIND. */
  maxMediaPerKind?: number;
};

export type CreatedChunkMetadata = {
  strategy: typeof SOCIAL_CONTENT_STRATEGY;
  contentType: ChunkContentType;
  hasContextPrefix: boolean;
  /** Position within the split content. Text chunks only. */
  partIndex?: number;
  /** Total parts the content was split into. Text chunks only. */
  partCount?: number;
};

export type CreatedChunkMediaMetadata = {
  kind: MediaKind;
  url: string;
  index: number;
  count: number;
};

/** Maps 1:1 onto a `chunks` row, minus `documentId` and the embedding columns. */
export type CreatedChunk = {
  chunkIndex: number;
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
  termIds?: string[];
  qualityScore?: number | null;
  /**
   * Seeds the denormalized counters on insert. Later refreshes are handled by
   * trg_sync_chunk_engagement, which only fires on UPDATE of documents.
   */
  engagement?: EngagementCounts;
};
