/** Number of candidates fetched per search method before RRF merge. */
export const RETRIEVAL_CANDIDATE_LIMIT = 20;

/** Final number of chunks returned after RRF merge and rerank. */
export const RETRIEVAL_RETURN_LIMIT = 8;

/** Minimum quality_score for a chunk to be eligible for retrieval. */
export const RETRIEVAL_QUALITY_MIN = 0.4;

/** RRF ranking constant — standard value; higher = less steep score falloff. */
export const RRF_K = 60;
