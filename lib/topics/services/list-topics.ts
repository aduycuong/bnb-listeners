import { sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  effectiveSentimentJoins,
  effectiveSentimentSql,
} from "@/lib/enrichment/utils/effective-sentiment-sql";

import type { TopicStatus } from "../config";
import type { ListTopicsParams, ListTopicsResult } from "../types";
import { uuidArraySql } from "../utils/topic-sql";

const SAMPLE_HINTS = 5;

type TopicRow = {
  id: string;
  name: string;
  description: string;
  aspect_id: string | null;
  status: TopicStatus;
  mention_count: number;
  positive: number;
  neutral: number;
  negative: number;
  last_7_days: number;
  previous_7_days: number;
  created_at: string;
};

/** Topics of a project, largest first, with sentiment split and 7-day counts of relevant mentions. */
export async function listTopics(params: ListTopicsParams): Promise<ListTopicsResult> {
  const statuses = params.includeHidden === "1" ? ["active", "hidden"] : ["active"];
  const [{ rows }, { rows: [counts] }] = await Promise.all([
    db.execute<TopicRow>(sql`
      select t.id, t.name, t.description, t.aspect_id, t.status, t.mention_count, t.created_at,
        (count(m.id) filter (where ${effectiveSentimentSql} = 'positive'))::int as positive,
        (count(m.id) filter (where ${effectiveSentimentSql} = 'neutral'))::int as neutral,
        (count(m.id) filter (where ${effectiveSentimentSql} = 'negative'))::int as negative,
        (count(m.id) filter (where m.published_at >= now() - interval '7 days'))::int as last_7_days,
        (count(m.id) filter (
          where m.published_at >= now() - interval '14 days' and m.published_at < now() - interval '7 days'
        ))::int as previous_7_days
      from topics t
      left join mention_topics mt on mt.topic_id = t.id and mt.kind = 'topic'
      left join mentions m on m.id = mt.mention_id and m.is_relevant
      ${effectiveSentimentJoins}
      where t.project_id = ${params.projectId}::uuid
        and t.kind = 'topic'
        and t.status in (${sql.join(statuses.map((status) => sql`${status}`), sql`, `)})
      group by t.id
      order by t.mention_count desc, t.name
    `),
    db.execute<{ waiting: number; pending: number }>(sql`
      select
        (count(*) filter (where me.status = 'waiting'))::int as waiting,
        (count(*) filter (where me.status = 'pending'))::int as pending
      from mention_enrichments me
      join mentions m on m.id = me.mention_id
      where m.project_id = ${params.projectId}::uuid and m.is_relevant
        and me.enricher_key = 'topic_assign'
    `),
  ]);

  const ids = rows.map((row) => row.id);
  const { rows: hintRows } = ids.length
    ? await db.execute<{ topic_id: string; hint: string }>(sql`
        select topic_id, hint from (
          select mt.topic_id, x.data->>'text' as hint,
            row_number() over (partition by mt.topic_id order by count(*) desc, x.data->>'text') as rank
          from mention_topics mt
          join mention_extractions x on x.mention_id = mt.mention_id and x.schema_key = 'topic_hint'
          join mentions m on m.id = mt.mention_id
          where mt.topic_id = any(${uuidArraySql(ids)})
            and mt.kind = 'topic' and m.is_relevant and x.data->>'text' is not null
          group by mt.topic_id, x.data->>'text'
        ) ranked
        where rank <= ${SAMPLE_HINTS}
        order by topic_id, rank
      `)
    : { rows: [] };

  return {
    items: rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      aspectId: row.aspect_id,
      status: row.status,
      mentionCount: row.mention_count,
      sentiments: { positive: row.positive, neutral: row.neutral, negative: row.negative },
      last7Days: row.last_7_days,
      previous7Days: row.previous_7_days,
      sampleHints: hintRows.filter((hint) => hint.topic_id === row.id).map((hint) => hint.hint),
      createdAt: new Date(row.created_at).toISOString(),
    })),
    waiting: counts?.waiting ?? 0,
    pending: counts?.pending ?? 0,
  };
}
