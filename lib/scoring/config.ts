/**
 * Scoring dimension weights.
 * Adjust multipliers here to rebalance quality_score without changing business logic.
 * Final quality_score = sum(score_i * weight_i) / sum(weight_i)
 */
export const SCORING_WEIGHTS = {
  sourceCredibility: 1,
  completeness: 1,
  freshness: 2,
  relevance: 3,
} as const;

export type ScoringDimensionKey = keyof typeof SCORING_WEIGHTS;

/**
 * Half-life in days for freshness scoring.
 * A document published exactly FRESHNESS_HALF_LIFE_DAYS ago receives a freshness score of 0.5.
 */
export const FRESHNESS_HALF_LIFE_DAYS = 90;

/**
 * Default LLM model used for relevance scoring.
 * Must be a key in chatModelRegistry (lib/langchain).
 */
export const DEFAULT_RELEVANCE_MODEL = "gpt-4.1" as const;
