export const TOPIC_DETAIL_CHART_PERIOD_PRESETS = [
  "last_7_days",
  "last_30_days",
  "last_90_days",
  "last_12_months",
  "this_week",
  "last_week",
  "this_month",
  "last_month",
  "this_year",
  "last_year",
  "custom",
] as const;

export type TermDetailChartPeriodPreset =
  (typeof TOPIC_DETAIL_CHART_PERIOD_PRESETS)[number];

export const TOPIC_DETAIL_CHART_PERIOD_LABELS: Record<
  TermDetailChartPeriodPreset,
  string
> = {
  last_7_days: "Last 7 days",
  last_30_days: "Last 30 days",
  last_90_days: "Last 90 days",
  last_12_months: "Last 12 months",
  this_week: "This week",
  last_week: "Last week",
  this_month: "This month",
  last_month: "Last month",
  this_year: "This year",
  last_year: "Last year",
  custom: "Custom range",
};

export const TOPIC_DETAIL_CHART_METRICS = [
  "doc_count",
  "avg_quality_score",
  "trend_score",
] as const;

export type TermDetailChartMetric =
  (typeof TOPIC_DETAIL_CHART_METRICS)[number];

export const TERM_DETAIL_CHART_METRIC_LABELS: Record<
  TermDetailChartMetric,
  string
> = {
  doc_count: "Document count",
  avg_quality_score: "Quality score",
  trend_score: "Trend score",
};

export const TERM_DETAIL_DOCUMENTS_PAGE_SIZE = 30;
