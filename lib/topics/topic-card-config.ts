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
