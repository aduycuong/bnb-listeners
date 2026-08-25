import { FRESHNESS_HALF_LIFE_DAYS } from "../config";

/**
 * Scores content freshness using exponential decay.
 *
 * Formula: score = 2^(-daysSincePublished / FRESHNESS_HALF_LIFE_DAYS)
 *   - Published today  → 1.0
 *   - Published 90 days ago (half-life) → ~0.5
 *   - Published 180 days ago → ~0.25
 *   - Published 365 days ago → ~0.07
 *
 * Uses publishedAt when available, falls back to createdAt.
 *
 * @returns Score in (0, 1]. Higher = fresher.
 */
export function scoreFreshness(
  createdAt: Date,
  publishedAt: Date | null,
): number {
  const referenceDate = publishedAt ?? createdAt;

  const msPerDay = 1000 * 60 * 60 * 24;
  const daysSince = (Date.now() - referenceDate.getTime()) / msPerDay;

  if (daysSince < 0) return 1.0;

  return Math.pow(2, -daysSince / FRESHNESS_HALF_LIFE_DAYS);
}
