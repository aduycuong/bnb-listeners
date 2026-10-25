import { AUTHOR_TIERS, MEDIA_BRAND_AUTHOR_TYPES, type AuthorTier } from "./config";

/**
 * Shared dashboard formulas (.ai/database-schema.md, L4): every page and, later, the L4 rollups
 * use these instead of writing their own. Engagement is `utils/engagement-sql.ts`, as it is
 * computed in SQL.
 */

/** Net sentiment score, −100 to +100, over mentions that have a sentiment; null when none do. */
export function netSentimentScore(counts: { positive: number; neutral: number; negative: number }) {
  const total = counts.positive + counts.neutral + counts.negative;
  return total ? Math.round(((counts.positive - counts.negative) / total) * 100) : null;
}

/** `part` of `total` in %, one decimal; null when `total` is 0. */
export function sharePercent(part: number, total: number) {
  return total ? Math.round((part / total) * 1000) / 10 : null;
}

/** Change of a count against the period before, in %; null when the period before is 0. */
export function growthPercent(current: number, previous: number) {
  return previous ? Math.round(((current - previous) / previous) * 1000) / 10 : null;
}

/**
 * Share of voice of the project's primary entities, in %: mentions about a primary entity
 * over mentions about a primary entity or a competitor (`mention_entities` from Enrich).
 */
export function shareOfVoice(counts: { primary: number; tracked: number }) {
  return sharePercent(counts.primary, counts.tracked);
}

/** Group of an author on the Authors page, from its type and follower count. */
export function authorTier(author: { followerCount: number | null; authorType: string | null }): AuthorTier {
  if ((MEDIA_BRAND_AUTHOR_TYPES as readonly string[]).includes(author.authorType ?? "")) {
    return "media_brand";
  }
  const followers = author.followerCount ?? 0;
  const tier = AUTHOR_TIERS.find(
    (item) => item.minFollowers !== null && followers >= item.minFollowers,
  );
  return tier?.key ?? "regular";
}
