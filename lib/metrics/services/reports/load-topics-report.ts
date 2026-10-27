import { sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  effectiveSentimentJoins,
  effectiveSentimentSql,
} from "@/lib/enrichment/utils/effective-sentiment-sql";

import type { ReportContext, ReportParamsMap, TopicsReport } from "../../types";
import { periodSql } from "../../utils/resolve-report-window";

type TopicRow = {
  id: string;
  name: string;
  mentions: number;
  positive: number;
  negative: number;
  previous: number;
};

/**
 * Active topics with relevant mentions in the period or the one before, most mentioned first
 * (all of them, or the first `limit`): growth against the period compared and sentiment shares
 * of the period. Reads `mention_topics` (L3).
 */
export async function loadTopicsReport(
  ctx: ReportContext,
  params: ReportParamsMap["topics"],
): Promise<TopicsReport> {
  const { current, either } = periodSql(ctx.window);
  const { rows } = await db.execute<TopicRow>(sql`
    select t.id, t.name,
      (count(m.id) filter (where ${current}))::int as mentions,
      (count(m.id) filter (where ${current} and ${effectiveSentimentSql} = 'positive'))::int as positive,
      (count(m.id) filter (where ${current} and ${effectiveSentimentSql} = 'negative'))::int as negative,
      (count(m.id) filter (where not (${current})))::int as previous
    from topics t
    join mention_topics mt on mt.topic_id = t.id and mt.kind = 'topic'
    join mentions m on m.id = mt.mention_id and m.is_relevant and ${either}
    ${effectiveSentimentJoins}
    where t.project_id = ${ctx.projectId}::uuid and t.kind = 'topic' and t.status = 'active'
    group by t.id
    order by mentions desc, previous desc, t.name
    ${params.limit ? sql`limit ${params.limit}` : sql``}
  `);

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    mentions: row.mentions,
    previousMentions: row.previous,
    growth: row.previous ? Math.round(((row.mentions - row.previous) / row.previous) * 100) : null,
    positive: wholePercent(row.positive, row.mentions),
    negative: wholePercent(row.negative, row.mentions),
  }));
}

function wholePercent(part: number, total: number) {
  return total ? Math.round((part / total) * 100) : 0;
}
