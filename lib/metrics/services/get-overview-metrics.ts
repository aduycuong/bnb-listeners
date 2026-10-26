import { sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  effectiveSentimentJoins,
  effectiveSentimentSql,
} from "@/lib/enrichment/utils/effective-sentiment-sql";
import { ownMentionSql } from "@/lib/mentions/utils/own-mention-sql";

import { METRICS_CONFIG } from "../config";
import {
  netSentimentScore,
  sharePercent,
  shareOfVoice,
} from "../formulas";
import type { MetricsReportParams, OverviewMetricsResult } from "../types";
import { engagementSql } from "../utils/engagement-sql";
import { loadDailySentiment } from "../utils/load-daily-sentiment";
import { periodSql, resolveReportWindow } from "../utils/resolve-report-window";

type PeriodRow = {
  period: "current" | "previous";
  mentions: number;
  engagement: number;
  authors: number;
  positive: number;
  neutral: number;
  negative: number;
  unknown: number;
  sov_primary: number;
  sov_tracked: number;
};

/**
 * Numbers of the Overview page for real projects: KPIs of the period against the period
 * compared (D28), mentions per day and sentiment, mentions per source and top topics. Reads L3
 * (`mentions`) directly until the L4 rollups exist; only relevant mentions count.
 */
export async function getOverviewMetrics(
  params: MetricsReportParams,
): Promise<OverviewMetricsResult> {
  const window = await resolveReportWindow(params.projectId, params.period);
  const period = periodSql(window);
  const allScope = sql`m.project_id = ${params.projectId}::uuid and m.is_relevant`;
  const scope = sql`${allScope} and ${ownMentionSql}`;
  const own = ownMentionSql;
  const inPeriod = period.current;

  const [{ rows: periodRows }, daily, { rows: sourceRows }, { rows: topicRows }, { rows: entityRows }] =
    await Promise.all([
      db.execute<PeriodRow>(sql`
        select case when ${period.current} then 'current' else 'previous' end as period,
          (count(*) filter (where ${own}))::int as mentions,
          coalesce(sum(${engagementSql(sql`ci`)}) filter (where ${own}), 0)::int as engagement,
          (count(distinct m.author_id) filter (where ${own}))::int as authors,
          (count(*) filter (where ${own} and ${effectiveSentimentSql} = 'positive'))::int as positive,
          (count(*) filter (where ${own} and ${effectiveSentimentSql} = 'neutral'))::int as neutral,
          (count(*) filter (where ${own} and ${effectiveSentimentSql} = 'negative'))::int as negative,
          (count(*) filter (where ${own} and ${effectiveSentimentSql} is null))::int as unknown,
          (count(*) filter (where exists (
            select 1 from mention_entities me join project_entities pe on pe.id = me.entity_id
            where me.mention_id = m.id and pe.role in ('primary', 'product')
          )))::int as sov_primary,
          (count(*) filter (where exists (
            select 1 from mention_entities me join project_entities pe on pe.id = me.entity_id
            where me.mention_id = m.id and pe.role in ('primary', 'product', 'competitor')
          )))::int as sov_tracked
        from mentions m
        join content_items ci on ci.id = m.content_item_id
        ${effectiveSentimentJoins}
        where ${allScope} and ${period.either}
        group by 1
      `),
      loadDailySentiment(params.projectId, window),
      db.execute<{ id: string | null; name: string | null; mentions: number }>(sql`
        select m.source_id as id, s.name, count(*)::int as mentions
        from mentions m
        left join sources s on s.id = m.source_id
        where ${scope} and ${inPeriod}
        group by m.source_id, s.name
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
      db.execute<{ competitors: number }>(sql`
        select count(*)::int as competitors from project_entities
        where project_id = ${params.projectId}::uuid and role = 'competitor'
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
    sov_primary: 0,
    sov_tracked: 0,
  };
  const current = periodRows.find((row) => row.period === "current") ?? empty;
  const previous = periodRows.find((row) => row.period === "previous") ?? empty;
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
    shareOfVoice: (entityRows[0]?.competitors ?? 0) > 0
      ? pick((row) => shareOfVoice({ primary: row.sov_primary, tracked: row.sov_tracked }))
      : null,
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
