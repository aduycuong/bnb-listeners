import { TERM_CARD_PERIOD_LABELS } from "@/lib/terms/term-card-config";
import type {
  FindTopTermsResult,
  TermAnalyticsDailyPoint,
  TermAnalyticsItem,
} from "@/lib/terms/types";

import { RESEARCH_ANALYTICS_MAX_BUCKETS } from "../config";

type FormatTermAnalyticsFindingParams = {
  query: string;
  topTerms: FindTopTermsResult;
  analyticsByTermId: Map<string, TermAnalyticsItem>;
};

function formatNumber(value: number | null, digits: number): string {
  return value === null ? "–" : value.toFixed(digits);
}

/** `2026-09-21` → `09-21` for compact bucket labels. */
function shortDate(dateKey: string): string {
  return dateKey.slice(5);
}

/**
 * Collapses the dense daily series into at most `RESEARCH_ANALYTICS_MAX_BUCKETS`
 * contiguous buckets (summing doc counts) so the trend stays readable for the
 * LLM regardless of period length.
 */
function formatDocsOverTime(daily: TermAnalyticsDailyPoint[]): string {
  if (daily.length === 0) return "–";

  const bucketSize = Math.max(
    1,
    Math.ceil(daily.length / RESEARCH_ANALYTICS_MAX_BUCKETS),
  );
  const buckets: string[] = [];

  for (let start = 0; start < daily.length; start += bucketSize) {
    const slice = daily.slice(start, start + bucketSize);
    const total = slice.reduce((sum, point) => sum + point.docCount, 0);
    buckets.push(`${shortDate(slice[0].dateKey)}: ${total}`);
  }

  return buckets.join(" · ");
}

function formatPeakDay(daily: TermAnalyticsDailyPoint[]): string {
  const peak = daily.reduce<TermAnalyticsDailyPoint | null>(
    (best, point) =>
      point.docCount > 0 && (!best || point.docCount > best.docCount)
        ? point
        : best,
    null,
  );

  return peak ? `${peak.dateKey} (${peak.docCount})` : "–";
}

function describeScope(topTerms: FindTopTermsResult, query: string): string {
  if (topTerms.resolvedMode === "term_group" && topTerms.termGroup) {
    return `term group "${topTerms.termGroup.name}"`;
  }
  if (topTerms.searchKeyword) {
    return `keyword "${topTerms.searchKeyword}"`;
  }
  return query.trim() ? `keyword "${query.trim()}"` : "all workspace terms";
}

/**
 * Renders one term-analytics snapshot as a compact Markdown block (header,
 * legend, table) so it reads as a single citable evidence item alongside
 * internal and web findings.
 */
export function formatTermAnalyticsFinding(
  params: FormatTermAnalyticsFindingParams,
): string {
  const { query, topTerms, analyticsByTermId } = params;
  const { period } = topTerms;
  const periodLabel = TERM_CARD_PERIOD_LABELS[period.preset];

  const header = [
    `Term analytics · ${periodLabel} (${period.startDate} → ${period.endDate})`,
    `Scope: ${describeScope(topTerms, query)}; ranked by trend score.`,
    "Docs = documents matched to the term in the window; Trend = summed daily trend score (higher = accelerating); Quality = average quality score (0–1).",
  ].join("\n");

  const rows = topTerms.items.map((item) => {
    const analytics = analyticsByTermId.get(item.id);
    const summary = analytics?.summary;
    const daily = analytics?.daily ?? [];
    const docs = summary
      ? `${summary.docCount}${summary.isStale ? " (stale)" : ""}`
      : String(item.docCount);
    const trend = formatNumber(summary?.trendScore ?? item.trendScore, 1);
    const quality = formatNumber(summary?.avgQualityScore ?? null, 2);

    return `| ${item.name} | ${docs} | ${trend} | ${quality} | ${formatDocsOverTime(daily)} | ${formatPeakDay(daily)} |`;
  });

  const table = [
    "| Term | Docs | Trend | Quality | Docs over time | Peak day |",
    "| --- | ---: | ---: | ---: | --- | --- |",
    ...rows,
  ].join("\n");

  return `${header}\n\n${table}`;
}
