import { sql } from "drizzle-orm";

import { db } from "@/lib/db";

import type { TopicReportParams, TopicReportResult } from "../types";

type ReportRow = {
  id: string;
  name: string;
  mentions: number;
  positive: number;
  negative: number;
  previous: number;
};

function percent(part: number, total: number) {
  return total ? Math.round((part / total) * 100) : 0;
}

/**
 * Active topics of a project for the Topics report over the last `days`: relevant
 * mentions published in the period, growth against the `days` before, and
 * positive/negative shares of the period. Topics without mentions in either
 * period are left out. Reads `mention_topics` directly until L4 metrics exist.
 */
export async function getTopicReport(params: TopicReportParams): Promise<TopicReportResult> {
  const { days } = params;
  const current = sql`m.published_at >= now() - make_interval(days => ${days})`;
  const { rows } = await db.execute<ReportRow>(sql`
    select t.id, t.name,
      (count(m.id) filter (where ${current}))::int as mentions,
      (count(m.id) filter (where ${current} and m.sentiment = 'positive'))::int as positive,
      (count(m.id) filter (where ${current} and m.sentiment = 'negative'))::int as negative,
      (count(m.id) filter (where not (${current})))::int as previous
    from topics t
    join mention_topics mt on mt.topic_id = t.id
    join mentions m on m.id = mt.mention_id and m.is_relevant
      and m.published_at >= now() - make_interval(days => ${days * 2})
    where t.project_id = ${params.projectId}::uuid and t.status = 'active'
    group by t.id
    order by mentions desc, previous desc, t.name
  `);

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
    days,
  };
}
