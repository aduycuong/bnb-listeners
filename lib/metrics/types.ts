import type { z } from "zod";

import type { Emotion, Sentiment } from "@/lib/enrichment/config";
import type { EnricherKey } from "@/lib/enrichment/registry";
import type { ProjectCase } from "@/lib/projects/project-cases";

import type { AuthorTier, REPORT_KEYS } from "./config";
import type { REPORT_PARAMS_SCHEMAS, reportPeriodSchema } from "./schema";
import type { ReportWindow } from "./utils/resolve-report-window";

export type ReportPeriod = z.infer<typeof reportPeriodSchema>;

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

export type ReportKey = (typeof REPORT_KEYS)[number];

/**
 * Whether a report has numbers for this project. `not_in_case`: the report belongs to another
 * case. `needs_enricher`: the enricher it reads is off. `needs_products`: the project has no
 * `product` entity.
 */
export type ReportAvailability = "ok" | "not_in_case" | "needs_enricher" | "needs_products";

export type ReportResult<T> =
  | { key: ReportKey; availability: "ok"; data: T }
  | { key: ReportKey; availability: Exclude<ReportAvailability, "ok">; data: null };

export type KpisReport = {
  /** Relevant mentions published in the period, comments included. */
  mentions: MetricsValue;
  /** Sum of item engagement (likes, comments, shares) over the period's mentions. */
  engagement: MetricsValue;
  uniqueAuthors: MetricsValue;
  /** −100 to +100; null when no mention of the period has a sentiment. */
  nss: MetricsValue<number | null>;
  /** Share of negative mentions among those with a sentiment, in %. */
  negativeShare: MetricsValue<number | null>;
};

/** Mentions of the period by sentiment, with the NSS and negative share they give. */
export type SentimentBreakdownReport = {
  positive: number;
  neutral: number;
  negative: number;
  /** Relevant mentions not enriched yet. */
  unknown: number;
  nss: number | null;
  negativeShare: number | null;
};

export type SentimentTrendReport = (MetricsDay & { nss: number | null })[];

/** Mentions of the period per emotion, in the order of `EMOTIONS`. */
export type EmotionsReport = { emotion: Emotion; mentions: number; share: number }[];

/** Project aspects in their order; shares of the aspect's mentions, in %. */
export type AspectSentimentReport = {
  id: string;
  /** Stable aspect key; comparisons line aspects up by it. */
  key: string;
  name: string;
  mentions: number;
  positive: number;
  negative: number;
  /** Null when no mention of the aspect has a sentiment. */
  nss: number | null;
}[];

/** Mentions of the period per channel (platform, Facebook groups apart), most first. */
export type ChannelBreakdownReport = {
  channel: string;
  mentions: number;
  positive: number;
  neutral: number;
  negative: number;
}[];

/** Sources with the most mentions in the period. */
export type SourceRankingReport = {
  id: string | null;
  name: string;
  channel: string;
  /** Mentions that are posts. */
  posts: number;
  mentions: number;
  engagement: number;
}[];

/** Mentions per weekday (0 = Monday) and hour of the project's timezone. */
export type PostingHeatmapReport = { weekday: number; hour: number; mentions: number }[];

export type TopicsReportItem = {
  id: string;
  name: string;
  /** Relevant mentions of the topic published in the period. */
  mentions: number;
  /** The same count for the period before. */
  previousMentions: number;
  /** Change against the period before, in %; null when the period before is empty. */
  growth: number | null;
  /** Share of the period's mentions, in %. */
  positive: number;
  negative: number;
};

/** Active topics with mentions in the period or the one before, most mentioned first. */
export type TopicsReport = TopicsReportItem[];

/** A keyword of the cloud: relevant mentions of the period that Enrich gave it (D16). */
export type KeywordsReportItem = {
  /** Normalized key. */
  keyword: string;
  /** The most common way the model wrote it. */
  text: string;
  mentions: number;
  /** Share of negative mentions, in %. */
  negative: number;
};

export type KeywordsReport = KeywordsReportItem[];

export type AuthorReportItem = {
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

/** Authors with the most engagement in the period. */
export type TopAuthorsReport = AuthorReportItem[];

export type AuthorTiersReport = {
  /** Authors of the period per group, in the order of `AUTHOR_TIERS`. */
  tiers: { tier: AuthorTier; authors: number }[];
  /** Authors of the period without a follower count (counted as regular users). */
  withoutFollowers: number;
};

export type PriceTrendReport = {
  /** Median of each day's kept resale quotes, million VND/m²; null when the day has none. */
  daily: { date: string; median: number | null }[];
  /** Period median of kept resale quotes, million VND/m². */
  median: MetricsValue<number | null>;
  /** Developer's reference price (`caseConfig.priceRef`), million VND/m². */
  priceRef: number | null;
  /** Resale quotes of the period before dedup and outlier filters. */
  quotes: number;
  used: number;
  droppedOutlier: number;
};

export type PriceDistributionReport = {
  buckets: { label: string; count: number }[];
  /** Kept resale quotes of the period. */
  used: number;
};

export type BuyerQuestionsReport = {
  /** Relevant `buyer_question` extractions in the period and the period before. */
  total: MetricsValue;
  items: { id: string; name: string; mentions: number }[];
};

/** A pillar of the reputation index: an aspect of the brand project. */
export type ReputationPillar = {
  id: string;
  /** Aspect key; comparisons line pillars up by it. */
  key: string;
  name: string;
  /** Mentions of the aspect with a sentiment. */
  mentions: number;
  /** 0–100; null below `reputationMinMentions`. */
  score: number | null;
};

export type ReputationIndexReport = {
  /** Reputation index of the period and the period before, 0–100. */
  index: MetricsValue<number | null>;
  /** Pillars of the period, in aspect order. */
  pillars: ReputationPillar[];
};

export type ReputationTrendReport = {
  /** `caseConfig.period` of the project: the unit of the trend. */
  period: "week" | "month" | "quarter";
  /** Last `reputationTrendPeriods` periods, oldest first, the running one last. */
  points: {
    /** First day of the period, `YYYY-MM-DD` in the project's timezone. */
    start: string;
    index: number | null;
  }[];
};

/** Projects (`product` entities) of the developer, most mentioned first. */
export type ProductSentimentReport = {
  id: string;
  name: string;
  mentions: number;
  nss: number | null;
}[];

export type ReportDataMap = {
  kpis: KpisReport;
  "sentiment-breakdown": SentimentBreakdownReport;
  "sentiment-trend": SentimentTrendReport;
  emotions: EmotionsReport;
  "aspect-sentiment": AspectSentimentReport;
  "channel-breakdown": ChannelBreakdownReport;
  "source-ranking": SourceRankingReport;
  "posting-heatmap": PostingHeatmapReport;
  topics: TopicsReport;
  keywords: KeywordsReport;
  "top-authors": TopAuthorsReport;
  "author-tiers": AuthorTiersReport;
  "price-trend": PriceTrendReport;
  "price-distribution": PriceDistributionReport;
  "buyer-questions": BuyerQuestionsReport;
  "reputation-index": ReputationIndexReport;
  "reputation-trend": ReputationTrendReport;
  "product-sentiment": ProductSentimentReport;
};

export type ReportParamsMap = { [K in ReportKey]: z.infer<(typeof REPORT_PARAMS_SCHEMAS)[K]> };

/** One report of a request; `params` are checked against the report's schema. */
export type ReportRequest<K extends ReportKey = ReportKey> = { key: K; params?: ReportParamsMap[K] };

/** What every report of a request shares, resolved once per request. */
export type ReportContext = {
  projectId: string;
  case: ProjectCase;
  caseConfig: Record<string, unknown>;
  window: ReportWindow;
  subject: { id: string; name: string } | null;
  products: { id: string; name: string }[];
  /** Ready enrichers the project runs. */
  enrichers: EnricherKey[];
};

export type GetReportsParams = {
  projectId: string;
  period: ReportPeriod;
  reports: readonly ReportRequest[];
};

export type GetCompareReportsParams = {
  workspaceId: string;
  /** The compare project (D30). */
  projectId: string;
  period: ReportPeriod;
  reports: readonly ReportRequest[];
};

export type GetCompareReportsResult<R extends readonly ReportRequest[] = ReportRequest[]> = {
  /** The period in the compare project's timezone; members resolve it in their own. */
  period: ReportPeriodInfo;
  /** The primary project first, then the competitors. */
  members: ({ id: string; name: string; primary: boolean } & Omit<GetReportsResult<R>, "period">)[];
  /** Aspects every member has, by key; the others are left out of comparisons. */
  sharedAspects: { key: string; name: string }[];
  /** Why the members cannot be compared now (a member deleted, too few left). */
  issues: string[];
  warnings: string[];
};

export type GetReportsResult<R extends readonly ReportRequest[] = ReportRequest[]> = {
  period: ReportPeriodInfo;
  timezone: string;
  /** The project's subject, to label series. */
  subject: { id: string; name: string } | null;
  /** In the order of the request. */
  reports: { [I in keyof R]: ReportResult<ReportDataMap[R[I]["key"]]> };
};
