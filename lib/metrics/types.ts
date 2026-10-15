import type { Emotion } from "@/lib/enrichment/config";

export type MetricsReportParams = { projectId: string; days: number };

/** A whole day of the project's timezone. */
export type MetricsDay = {
  /** `YYYY-MM-DD` in the project's timezone. */
  date: string;
  positive: number;
  neutral: number;
  negative: number;
  /** Relevant mentions not enriched yet. */
  unknown: number;
};

/** A value of the period and the same value for the period before. */
export type MetricsValue<T = number> = { current: T; previous: T };

export type OverviewMetricsResult = {
  days: number;
  timezone: string;
  /** Relevant mentions published in the period, comments included. */
  mentions: MetricsValue;
  /** Sum of item engagement (likes, comments, shares) over the period's mentions. */
  engagement: MetricsValue;
  uniqueAuthors: MetricsValue;
  /** −100 to +100; null when no mention of the period has a sentiment. */
  nss: MetricsValue<number | null>;
  /** Share of negative mentions among those with a sentiment, in %. */
  negativeShare: MetricsValue<number | null>;
  /** Null when the project has no competitor entity. */
  shareOfVoice: MetricsValue<number | null> | null;
  sentiment: { positive: number; neutral: number; negative: number; unknown: number };
  daily: MetricsDay[];
  sources: { id: string | null; name: string; mentions: number }[];
  topics: { id: string; name: string; mentions: number }[];
};

export type SentimentMetricsResult = {
  days: number;
  timezone: string;
  daily: (MetricsDay & { nss: number | null })[];
  /** Mentions of the period per emotion, in the order of `EMOTIONS`. */
  emotions: { emotion: Emotion; mentions: number; share: number }[];
  /** Project aspects in their order; shares of the aspect's mentions, in %. */
  aspects: { id: string; name: string; mentions: number; positive: number; negative: number }[];
};
