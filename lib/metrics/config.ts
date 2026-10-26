/** Dashboard metric settings (docs/plan.md phase 5b). */
export const METRICS_CONFIG = {
  /**
   * Periods of the Overview and Sentiment pages, in whole days of the project's timezone,
   * today included, in picker order. Changes compare with the same number of days before.
   */
  reportPeriodDays: [7, 14, 30],
  /** Period of a report until the user picks another one (then remembered across reports). */
  defaultReportPeriodDays: 14,
  /** Longest rolling or custom period, in days. */
  maxPeriodDays: 366,
  /** Days each Enrich run rewrites in L4 (D28), besides the days of the enriched threads. */
  dailyRefreshDays: 35,
  /** Rows of the "Kênh thảo luận" (by source) and "Chủ đề nổi bật" panels. */
  topSources: 6,
  topTopics: 6,
  /** FAQ groups on the project-case page. */
  topBuyerQuestions: 8,
  /** Rows of the sources table on the Channels page and of the authors table. */
  channelSources: 10,
  topAuthors: 20,
  /** Mentions with a sentiment a pillar needs before it gets a reputation score. */
  reputationMinMentions: 5,
  /** Report periods (`caseConfig.period`) on the reputation trend of the brand case. */
  reputationTrendPeriods: 6,
} as const;

/** Calendar report periods (D28), in the project's timezone; a week runs Monday to Sunday. */
export const REPORT_PERIOD_TYPES = ["week", "month", "quarter", "year"] as const;

/** Labels of the reputation index (brand case), by lowest score of the band. */
export const REPUTATION_BANDS = [
  { min: 70, label: "tốt" },
  { min: 55, label: "khá" },
  { min: 40, label: "trung bình" },
  { min: 0, label: "yếu" },
] as const;

/**
 * Author groups of the Authors page, as in the demo. Follower thresholds decide the KOL
 * groups; `authors.author_type` media or brand wins. Authors without a follower count fall
 * into "regular" until authors are classified (follow-up task).
 */
export const AUTHOR_TIERS = [
  { key: "mega", label: "Mega KOL (>1 tr)", minFollowers: 1_000_000 },
  { key: "macro", label: "Macro KOL (100K–1 tr)", minFollowers: 100_000 },
  { key: "micro", label: "Micro KOL (10K–100K)", minFollowers: 10_000 },
  { key: "regular", label: "Người dùng thường", minFollowers: 0 },
  { key: "media_brand", label: "Báo chí, thương hiệu", minFollowers: null },
] as const;

export type AuthorTier = (typeof AUTHOR_TIERS)[number]["key"];

/** `authors.author_type` values counted as "Báo chí, thương hiệu". */
export const MEDIA_BRAND_AUTHOR_TYPES = ["media", "brand"] as const;
