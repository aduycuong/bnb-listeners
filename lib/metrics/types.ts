import type { Emotion, Sentiment } from "@/lib/enrichment/config";

import type { AuthorTier } from "./config";

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

export type ChannelMetricsResult = {
  days: number;
  timezone: string;
  /** Mentions of the period per channel (platform, Facebook groups apart), most first. */
  channels: { channel: string; mentions: number; positive: number; neutral: number; negative: number }[];
  /** Mentions per weekday (0 = Monday) and hour of the project's timezone. */
  heat: { weekday: number; hour: number; mentions: number }[];
  /** Sources with the most mentions in the period. */
  sources: {
    id: string | null;
    name: string;
    channel: string;
    /** Mentions that are posts. */
    posts: number;
    mentions: number;
    engagement: number;
  }[];
};

export type AuthorMetricsItem = {
  id: string;
  name: string;
  url: string | null;
  channel: string;
  followers: number | null;
  tier: AuthorTier;
  mentions: number;
  /** Sum of the engagement of the author's mentions in the period. */
  engagement: number;
  /** Most frequent sentiment of the author's mentions; null when none has one. */
  sentiment: Sentiment | null;
};

export type AuthorMetricsResult = {
  days: number;
  timezone: string;
  /** Authors with the most engagement in the period. */
  items: AuthorMetricsItem[];
  /** Authors of the period per group, in the order of `AUTHOR_TIERS`. */
  tiers: { tier: AuthorTier; authors: number }[];
  /** Authors of the period without a follower count (counted as regular users). */
  withoutFollowers: number;
};

/** One day of the price trend; null when that day has no kept quote. */
export type ProjectCasePricePoint = {
  date: string;
  primary: number | null;
  competitor: number | null;
  /** Developer's `priceRef`, million VND/m², when configured. */
  priceRef: number | null;
};

export type ProjectCaseMetricsResult = {
  days: number;
  timezone: string;
  primaryName: string;
  hasCompetitors: boolean;
  price: {
    /** Daily median of kept resale quotes, million VND/m². */
    daily: ProjectCasePricePoint[];
    /** Period median of the tracked project's kept resale quotes, million VND/m². */
    median: MetricsValue<number | null>;
    priceRef: number | null;
    buckets: { label: string; count: number }[];
    /** Resale quotes of the period before dedup and outlier filters. */
    quotes: number;
    used: number;
    droppedMultiEntity: number;
    droppedOutlier: number;
  };
  questions: {
    /** Relevant `buyer_question` extractions in the period and the period before. */
    total: MetricsValue;
    items: { id: string; name: string; mentions: number }[];
  };
  aspects: {
    id: string;
    name: string;
    primary: number | null;
    competitor: number | null;
  }[];
};
