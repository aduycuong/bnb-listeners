/**
 * Minimum LLM relevance score (0–1) for a part to be eligible for chunking.
 * "Above average" on the 0–10 scale the prompt uses.
 */
export const PART_RELEVANCE_MIN = 0.5;

/** Minimum LLM detail score (0–1) for a part to be eligible for chunking. */
export const PART_DETAIL_MIN = 0.5;

/**
 * Model used to score text parts.
 * Must be a key in chatModelRegistry (lib/langchain).
 */
export const TEXT_SCORING_MODEL = "gpt-4.1" as const;

/**
 * Model used to score image parts. Pinned to a vision-capable model —
 * per-step model configuration is planned but not implemented yet.
 */
export const VISION_SCORING_MODEL = "gpt-4.1" as const;

/** Max characters of a text part sent to the scoring model. */
export const TEXT_SCORING_MAX_CHARS = 8_000;
