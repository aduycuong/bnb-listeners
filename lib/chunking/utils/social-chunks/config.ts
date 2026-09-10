import type { MediaKind } from "./types";

/** Strategy tag written to the metadata of every chunk produced by this module. */
export const SOCIAL_CONTENT_STRATEGY = "chunk_social_content" as const;

/** Content at or below this length stays a single atomic chunk instead of being split. */
export const ATOMIC_MAX_CHARACTERS = 2000;

/** Floor for the per-part content budget, so a long context prefix cannot starve the content. */
export const MIN_CONTENT_BUDGET = 200;

/** Characters of post text paired with each media item so the multimodal input has textual grounding. */
export const MEDIA_SNIPPET_CHARACTERS = 300;

/** Safety cap on how many media chunks are produced per kind, per call. */
export const MAX_MEDIA_PER_KIND = 10;

/** Stand-in text for media on a post with no caption, so chunks.content is never empty. */
export const MEDIA_FALLBACK_TEXT: Record<MediaKind, string> = {
  image: "Hình ảnh đính kèm, không có nội dung văn bản.",
  video: "Video đính kèm, không có nội dung văn bản.",
};

/**
 * Voyage model used for media chunks. Returns 1024 dimensions by default,
 * matching chunks.embedding_multimodal — bump CHUNK_MULTIMODAL_EMBEDDING_DIMENSIONS
 * and the column together if this ever changes.
 */
export const MULTIMODAL_EMBEDDING_MODEL = "voyage-multimodal-3.5" as const;

export const VOYAGE_MULTIMODAL_ENDPOINT =
  "https://api.voyageai.com/v1/multimodalembeddings";

/**
 * Media inputs per Voyage request. The API allows 1,000 inputs but caps the
 * combined payload at 320,000 tokens (every 560 image pixels / 1,120 video
 * pixels counts as a token), so a small batch keeps full-resolution media
 * inside the budget.
 */
export const MULTIMODAL_BATCH_SIZE = 8;
