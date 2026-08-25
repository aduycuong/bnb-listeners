import type { ScoringDimensions } from "../types";

/**
 * Combines dimension scores into a single quality_score using weighted average.
 *
 * quality_score = sum(score_i * weight_i) / sum(weight_i)
 *
 * Result is rounded to 4 decimal places and clamped to [0, 1].
 */
export function combineScores(dimensions: ScoringDimensions): number {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const dim of Object.values(dimensions)) {
    weightedSum += dim.score * dim.weight;
    totalWeight += dim.weight;
  }

  if (totalWeight === 0) return 0;

  const raw = weightedSum / totalWeight;
  return Math.round(Math.min(1, Math.max(0, raw)) * 10_000) / 10_000;
}
