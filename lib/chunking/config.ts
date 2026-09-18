/** Target character count per retrieval chunk (content only, excluding context prefix). */
export const CHUNK_TARGET_CHARACTERS = 900;

/** Character overlap between consecutive retrieval chunks. */
export const CHUNK_OVERLAP_CHARACTERS = 120;

/** OpenAI embedding model — must match chunks.embedding_model default and the vector dimension. */
export const EMBEDDING_MODEL = "text-embedding-3-small" as const;

/** Version tag written to chunks.embedding_version. Bump when chunking logic or model changes. */
export const EMBEDDING_VERSION = "v2" as const;
