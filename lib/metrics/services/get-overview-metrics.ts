import { sql } from "drizzle-orm";

import { db } from "@/lib/db";

import { METRICS_CONFIG } from "../config";
import { netSentimentScore, sharePercent } from "../formulas";
import type { MetricsReportParams, OverviewMetricsResult } from "../types";
import { loadDailySentiment } from "../utils/load-daily-sentiment";
import {
  periodDateSql,
  periodSql,
  resolveReportWindow,
} from "../utils/resolve-report-window";

type PeriodRow = {
  period: "current" | "previous";
  mentions: number;
  engagement: number;
  authors: number;
  positive: number;
  neutral: number;
  negative: number;
  unknown: number;
};

/**
 * Numbers of the Overview page for real projects: KPIs of the period against the period
 * compared (D28), mentions per day and sentiment, mentions per source and top topics. Counts
 * are sums of L4 (`project_metrics_daily`); distinct authors and topics read L3. Only
 * relevant mentions count: they are about the project's subject (D30).
 */
export async function getOverviewMetrics(
  params: MetricsReportParams,
): Promise<OverviewMetricsResult> {
  const window = await resolveReportWindow(params.projectId, params.period);
  const period = periodSql(window);
  const days = periodDateSql(window);
  const scope = sql`m.project_id = ${params.projectId}::uuid and m.is_relevant`;
  const inPeriod = period.current;

  const [
    { rows: periodRows },
    { rows: authorRows },
    daily,
    { rows: sourceRows },
    { rows: topicRows },
  ] = await Promise.all([
      db.execute<Omit<PeriodRow, "authors">>(sql`
        select case when ${days.current} then 'current' else 'previous' end as period,
          sum(d.mentions)::int as mentions,
          sum(d.engagement)::int as engagement,
          sum(d.positive)::int as positive,
          sum(d.neutral)::int as neutral,
          sum(d.negative)::int as negative,
          sum(d.unknown)::int as unknown
        from project_metrics_daily d
        where d.project_id = ${params.projectId}::uuid and ${days.either}
        group by 1
      `),
      // Distinct authors do not add up over days (D28).
      db.execute<{ period: PeriodRow["period"]; authors: number }>(sql`
        select case when ${period.current} then 'current' else 'previous' end as period,
          count(distinct m.author_id)::int as authors
        from mentions m
        where ${scope} and ${period.either}
        group by 1
      `),
      loadDailySentiment(params.projectId, window),
      db.execute<{ id: string | null; name: string | null; mentions: number }>(sql`
        select d.source_id as id, s.name, sum(d.mentions)::int as mentions
        from project_metrics_daily d
        left join sources s on s.id = d.source_id
        where d.project_id = ${params.projectId}::uuid and ${days.current}
        group by d.source_id, s.name
        having sum(d.mentions) > 0
        order by mentions desc, s.name
        limit ${METRICS_CONFIG.topSources}
      `),
      db.execute<{ id: string; name: string; mentions: number }>(sql`
        select t.id, t.name, count(*)::int as mentions
        from topics t
        join mention_topics mt on mt.topic_id = t.id and mt.kind = 'topic'
        join mentions m on m.id = mt.mention_id
        where t.project_id = ${params.projectId}::uuid and t.kind = 'topic' and t.status = 'active'
          and ${scope} and ${inPeriod}
        group by t.id
        order by mentions desc, t.name
        limit ${METRICS_CONFIG.topTopics}
      `),
    ]);

  const empty: PeriodRow = {
    period: "current",
    mentions: 0,
    engagement: 0,
    authors: 0,
    positive: 0,
    neutral: 0,
    negative: 0,
    unknown: 0,
  };
  const withAuthors = (period: PeriodRow["period"]): PeriodRow => ({
    ...(periodRows.find((row) => row.period === period) ?? empty),
    period,
    authors: authorRows.find((row) => row.period === period)?.authors ?? 0,
  });
  const current = withAuthors("current");
  const previous = withAuthors("previous");
  const pick = <T,>(read: (row: PeriodRow) => T) => ({ current: read(current), previous: read(previous) });

  return {
    period: window.info,
    timezone: window.timezone,
    mentions: pick((row) => row.mentions),
    engagement: pick((row) => row.engagement),
    uniqueAuthors: pick((row) => row.authors),
    nss: pick((row) => netSentimentScore(row)),
    negativeShare: pick((row) =>
      sharePercent(row.negative, row.positive + row.neutral + row.negative),
    ),
    sentiment: {
      positive: current.positive,
      neutral: current.neutral,
      negative: current.negative,
      unknown: current.unknown,
    },
    daily,
    sources: sourceRows.map((row) => ({
      id: row.id,
      name: row.name ?? "Nguồn không rõ",
      mentions: row.mentions,
    })),
    topics: topicRows,
  };
}
