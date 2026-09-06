export const TOPIC_CARD_PAGE_SIZE = 24;

export const TOPIC_CARD_PERIOD_PRESETS = [
  "this_week",
  "last_week",
  "this_month",
  "last_month",
  "last_7_days",
  "last_30_days",
  "custom",
] as const;

export type TopicCardPeriodPreset = (typeof TOPIC_CARD_PERIOD_PRESETS)[number];

export const TOPIC_CARD_PERIOD_LABELS: Record<TopicCardPeriodPreset, string> = {
  this_week: "This week",
  last_week: "Last week",
  this_month: "This month",
  last_month: "Last month",
  last_7_days: "Last 7 days",
  last_30_days: "Last 30 days",
  custom: "Custom range",
};

export const TOPIC_CARD_SORT_OPTIONS = [
  "trend",
  "count",
  "quality",
] as const;

export type TopicCardSort = (typeof TOPIC_CARD_SORT_OPTIONS)[number];

export const TOPIC_CARD_SORT_LABELS: Record<TopicCardSort, string> = {
  trend: "Trending",
  count: "Document count",
  quality: "Quality score",
};

export const TOPIC_CARD_SPARKLINE_DAYS = 7;

// ---------------------------------------------------------------------------
// Server-side cache TTL per period preset.
//
// null  → no caching (custom range: caller controls dates).
// fixed past periods (last_week, last_month) can be cached longer because
// their date bounds never change.
// current periods (this_week, this_month) are refreshed every 15 min to
// keep up with the recompute job cadence.
// rolling windows (last_7_days, last_30_days) change as today advances —
// shorter TTL.
// ---------------------------------------------------------------------------
export const TOPIC_CARD_CACHE_SECONDS: Record<TopicCardPeriodPreset, number | null> = {
  last_week:    3600, // fixed past week — cache 1 hour
  last_month:   3600, // fixed past month — cache 1 hour
  this_week:     900, // current week — cache 15 min (matches recompute cadence)
  this_month:    900, // current month — cache 15 min
  last_7_days:   600, // rolling 7-day — cache 10 min
  last_30_days:  600, // rolling 30-day — cache 10 min
  custom:       null, // user-defined range — never cache
};
