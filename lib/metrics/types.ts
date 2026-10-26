import type { Emotion, Sentiment } from "@/lib/enrichment/config";

import type { z } from "zod";

import type { AuthorTier } from "./config";
import type { reportPeriodSchema } from "./schema";

export type ReportPeriod = z.infer<typeof reportPeriodSchema>;

export type MetricsReportParams = { projectId: string; period: ReportPeriod };

/** Days to rewrite in L4: those holding `from` and `to`; every day when both are left out. */
export type RefreshProjectMetricsDailyParams = { projectId: string; from?: Date; to?: Date };

export type RefreshProjectMetricsDailyResult = { metricRows: number; aspectRows: number };

/** The days a report covers, `YYYY-MM-DD` in the project's timezone, last days included. */
export type ReportPeriodInfo = {
  type: ReportPeriod["type"];
  start: string;
  end: string;
  days: number;
  /** The period compared against: the one before, cut to the same length while running. */
  previousStart: string;
  previousEnd: string;
  /** False while the period still runs (it holds today). */
  complete: boolean;
};

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
  period: ReportPeriodInfo;
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
  period: ReportPeriodInfo;
  timezone: string;
  daily: (MetricsDay & { nss: number | null })[];
  /** Mentions of the period per emotion, in the order of `EMOTIONS`. */
  emotions: { emotion: Emotion; mentions: number; share: number }[];
  /** Project aspects in their order; shares of the aspect's mentions, in %. */
  aspects: { id: string; name: string; mentions: number; positive: number; negative: number }[];
};

export type ChannelMetricsResult = {
  period: ReportPeriodInfo;
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
  period: ReportPeriodInfo;
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
  period: ReportPeriodInfo;
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

/** A pillar of the reputation index: an aspect of the brand project. */
export type BrandCasePillar = {
  id: string;
  name: string;
  /** Mentions of the aspect with a sentiment. */
  mentions: number;
  /** 0–100; null below `reputationMinMentions`. */
  score: number | null;
};

/** One report period of the reputation trend. */
export type BrandCaseTrendPoint = {
  /** First day of the period, `YYYY-MM-DD` in the project's timezone. */
  start: string;
  primary: number | null;
  /** Mean index of the competitors that have one in the period. */
  competitors: number | null;
};

export type BrandCaseMetricsResult = {
  period: ReportPeriodInfo;
  timezone: string;
  primaryName: string;
  hasCompetitors: boolean;
  /** Reputation index of the period and the period before, 0–100. */
  index: MetricsValue<number | null>;
  /** Pillars of the period, in aspect order. */
  pillars: BrandCasePillar[];
  /** Projects (`product` entities) of the developer, most mentioned first. */
  products: { id: string; name: string; mentions: number; nss: number | null }[];
  /** Mentions of the period naming the developer (or its projects) and each competitor. */
  shareOfVoice: { id: string; name: string; role: "primary" | "competitor"; mentions: number }[];
  /** `caseConfig.period` of the project: the unit of the trend. */
  trendPeriod: "week" | "month" | "quarter";
  /** Last `reputationTrendPeriods` periods, oldest first, the running one last. */
  trend: BrandCaseTrendPoint[];
};
