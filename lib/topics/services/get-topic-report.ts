import { sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  effectiveSentimentJoins,
  effectiveSentimentSql,
} from "@/lib/enrichment/utils/effective-sentiment-sql";
import { periodSql, resolveReportWindow } from "@/lib/metrics/utils/resolve-report-window";

import { TOPIC_CONFIG } from "../config";
import type { TopicReportParams, TopicReportResult } from "../types";

type ReportRow = {
  id: string;
  name: string;
  mentions: number;
  positive: number;
  negative: number;
  previous: number;
};

type KeywordRow = { keyword: string; text: string; mentions: number; negative: number };

function percent(part: number, total: number) {
  return total ? Math.round((part / total) * 100) : 0;
}

/**
 * Active topics of a project for the Topics report over a period (D28): relevant
 * mentions published in the period, growth against the period compared, and
 * positive/negative shares of the period. Topics without mentions in either
 * period are left out. Reads `mention_topics` directly until L4 metrics exist.
 * Keywords of the cloud are counted the same way from `mention_terms` (D16/D18).
 */
export async function getTopicReport(params: TopicReportParams): Promise<TopicReportResult> {
  const window = await resolveReportWindow(params.projectId, params.period);
  const { current, either } = periodSql(window);
  const [{ rows }, { rows: keywordRows }] = await Promise.all([
    db.execute<ReportRow>(sql`
      select t.id, t.name,
        (count(m.id) filter (where ${current}))::int as mentions,
        (count(m.id) filter (where ${current} and ${effectiveSentimentSql} = 'positive'))::int as positive,
        (count(m.id) filter (where ${current} and ${effectiveSentimentSql} = 'negative'))::int as negative,
        (count(m.id) filter (where not (${current})))::int as previous
      from topics t
      join mention_topics mt on mt.topic_id = t.id and mt.kind = 'topic'
      join mentions m on m.id = mt.mention_id and m.is_relevant
        and ${either}
      ${effectiveSentimentJoins}
      where t.project_id = ${params.projectId}::uuid and t.kind = 'topic' and t.status = 'active'
      group by t.id
      order by mentions desc, previous desc, t.name
    `),
    db.execute<KeywordRow>(sql`
      select mt.term as keyword, mode() within group (order by mt.text) as text,
        count(*)::int as mentions,
        (count(*) filter (where ${effectiveSentimentSql} = 'negative'))::int as negative
      from mention_terms mt
      join mentions m on m.id = mt.mention_id
      ${effectiveSentimentJoins}
      where m.project_id = ${params.projectId}::uuid and m.is_relevant
        and mt.kind = 'keyword' and ${current}
      group by mt.term
      order by mentions desc, mt.term
      limit ${TOPIC_CONFIG.reportKeywords}
    `),
  ]);

  return {
    items: rows.map((row) => ({
      id: row.id,
      name: row.name,
      mentions: row.mentions,
      previousMentions: row.previous,
      growth: row.previous ? Math.round(((row.mentions - row.previous) / row.previous) * 100) : null,
      positive: percent(row.positive, row.mentions),
      negative: percent(row.negative, row.mentions),
    })),
    keywords: keywordRows.map((row) => ({
      keyword: row.keyword,
      text: row.text,
      mentions: row.mentions,
      negative: percent(row.negative, row.mentions),
    })),
    period: window.info,
  };
}
