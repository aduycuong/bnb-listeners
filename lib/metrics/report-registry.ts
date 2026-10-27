import type { EnricherKey } from "@/lib/enrichment/registry";

import { loadAspectSentimentReport } from "./services/reports/load-aspect-sentiment-report";
import { loadAuthorTiersReport } from "./services/reports/load-author-tiers-report";
import { loadBuyerQuestionsReport } from "./services/reports/load-buyer-questions-report";
import { loadChannelBreakdownReport } from "./services/reports/load-channel-breakdown-report";
import { loadEmotionsReport } from "./services/reports/load-emotions-report";
import { loadKeywordsReport } from "./services/reports/load-keywords-report";
import { loadKpisReport } from "./services/reports/load-kpis-report";
import { loadPostingHeatmapReport } from "./services/reports/load-posting-heatmap-report";
import { loadPriceDistributionReport } from "./services/reports/load-price-distribution-report";
import { loadPriceTrendReport } from "./services/reports/load-price-trend-report";
import { loadProductSentimentReport } from "./services/reports/load-product-sentiment-report";
import { loadReputationIndexReport } from "./services/reports/load-reputation-index-report";
import { loadReputationTrendReport } from "./services/reports/load-reputation-trend-report";
import { loadSentimentBreakdownReport } from "./services/reports/load-sentiment-breakdown-report";
import { loadSentimentTrendReport } from "./services/reports/load-sentiment-trend-report";
import { loadSourceRankingReport } from "./services/reports/load-source-ranking-report";
import { loadTopAuthorsReport } from "./services/reports/load-top-authors-report";
import { loadTopicsReport } from "./services/reports/load-topics-report";
import type {
  ReportAvailability,
  ReportContext,
  ReportDataMap,
  ReportKey,
  ReportParamsMap,
} from "./types";

type ReportDefinition<K extends ReportKey> = {
  /** Whether the project has numbers for the report; `ok` when left out. */
  available?: (ctx: ReportContext) => ReportAvailability;
  load: (ctx: ReportContext, params: ReportParamsMap[K]) => Promise<ReportDataMap[K]>;
};

const needsEnricher =
  (key: EnricherKey) =>
  (ctx: ReportContext): ReportAvailability =>
    ctx.enrichers.includes(key) ? "ok" : "needs_enricher";

const brandOnly = (ctx: ReportContext): ReportAvailability =>
  ctx.case === "brand" ? "ok" : "not_in_case";

/**
 * Every report a page can request. Availability follows what the project has (enrichers,
 * products) rather than its case where it can, so a new case gets the boxes its data allows.
 */
export const REPORT_REGISTRY: { [K in ReportKey]: ReportDefinition<K> } = {
  kpis: { load: loadKpisReport },
  "sentiment-breakdown": { load: loadSentimentBreakdownReport },
  "sentiment-trend": { load: loadSentimentTrendReport },
  emotions: { load: loadEmotionsReport },
  "aspect-sentiment": { load: loadAspectSentimentReport },
  "channel-breakdown": { load: loadChannelBreakdownReport },
  "source-ranking": { load: loadSourceRankingReport },
  "posting-heatmap": { load: loadPostingHeatmapReport },
  topics: { load: loadTopicsReport },
  keywords: { load: loadKeywordsReport },
  "top-authors": { load: loadTopAuthorsReport },
  "author-tiers": { load: loadAuthorTiersReport },
  "price-trend": { available: needsEnricher("price_quote"), load: loadPriceTrendReport },
  "price-distribution": { available: needsEnricher("price_quote"), load: loadPriceDistributionReport },
  "buyer-questions": { available: needsEnricher("buyer_question"), load: loadBuyerQuestionsReport },
  "reputation-index": { available: brandOnly, load: loadReputationIndexReport },
  "reputation-trend": { available: brandOnly, load: loadReputationTrendReport },
  "product-sentiment": {
    available: (ctx) => (ctx.products.length ? "ok" : "needs_products"),
    load: loadProductSentimentReport,
  },
};
