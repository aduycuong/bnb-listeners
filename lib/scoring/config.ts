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

/**
 * Model used to score video parts. Pinned to Gemini, which natively
 * understands video (frames + audio) — no client-side frame sampling needed.
 */
export const VIDEO_SCORING_MODEL = "gemini-3.5-flash-lite" as const;

/** Max characters of a text part sent to the scoring model. */
export const TEXT_SCORING_MAX_CHARS = 8_000;

/**
 * Max size of a video inlined into the Gemini request as base64.
 * The Gemini API rejects inline requests larger than ~20 MB total; we cap a
 * little under that so the prompt + encoding overhead still fits. Videos above
 * this are recorded as `failed` (ineligible) rather than crashing the run.
 * Larger videos should move to the Gemini Files API — see scoreVideoPart.
 */
export const VIDEO_SCORING_MAX_BYTES = 18_000_000;
