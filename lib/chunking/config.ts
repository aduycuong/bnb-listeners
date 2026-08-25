/** Target character count per retrieval chunk (content only, excluding context prefix). */
export const CHUNK_TARGET_CHARACTERS = 900;

/** Character overlap between consecutive retrieval chunks. */
export const CHUNK_OVERLAP_CHARACTERS = 120;

/** Minimum quality_score required to keep a document's chunks in the retrieval index. */
export const QUALITY_SCORE_THRESHOLD = 0.5;

/**
 * Cosine similarity threshold for near-duplicate detection.
 * Two documents are considered near-duplicates when the average
 * chunk-level similarity exceeds this value (0.95 = almost verbatim copy).
 */
export const NEAR_DUPLICATE_THRESHOLD = 0.95;

/**
 * Minimum number of matching chunk pairs required before marking a document
 * as a near-duplicate. Prevents false positives on very short content.
 */
export const NEAR_DUPLICATE_MIN_MATCHES = 2;

/** OpenAI embedding model — must match chunks.embedding_model default and the vector dimension. */
export const EMBEDDING_MODEL = "text-embedding-3-small" as const;

/** Version tag written to chunks.embedding_version. Bump when chunking logic or model changes. */
export const EMBEDDING_VERSION = "v1" as const;
