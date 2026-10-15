/** Dashboard metric settings (docs/plan.md phase 5b). */
export const METRICS_CONFIG = {
  /**
   * Periods of the Overview and Sentiment pages, in whole days of the project's timezone,
   * today included; the first is the default. Changes compare with the same number of days before.
   */
  reportPeriodDays: [14, 7, 30],
  /** Rows of the "Kênh thảo luận" (by source) and "Chủ đề nổi bật" panels. */
  topSources: 6,
  topTopics: 6,
} as const;
