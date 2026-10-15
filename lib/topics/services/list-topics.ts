import { sql } from "drizzle-orm";

import { db } from "@/lib/db";

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
        (count(m.id) filter (where m.sentiment = 'positive'))::int as positive,
        (count(m.id) filter (where m.sentiment = 'neutral'))::int as neutral,
        (count(m.id) filter (where m.sentiment = 'negative'))::int as negative,
        (count(m.id) filter (where m.published_at >= now() - interval '7 days'))::int as last_7_days,
        (count(m.id) filter (
          where m.published_at >= now() - interval '14 days' and m.published_at < now() - interval '7 days'
        ))::int as previous_7_days
      from topics t
      left join mention_topics mt on mt.topic_id = t.id
      left join mentions m on m.id = mt.mention_id and m.is_relevant
      where t.project_id = ${params.projectId}::uuid
        and t.status in (${sql.join(statuses.map((status) => sql`${status}`), sql`, `)})
      group by t.id
      order by t.mention_count desc, t.name
    `),
    db.execute<{ waiting: number; pending: number }>(sql`
      select
        (count(*) filter (where enrich_status = 'done' and topic_status = 'unassigned'))::int as waiting,
        (count(*) filter (where enrich_status <> 'done' or topic_status = 'pending'))::int as pending
      from mentions
      where project_id = ${params.projectId}::uuid and is_relevant
    `),
  ]);

  const ids = rows.map((row) => row.id);
  const { rows: hintRows } = ids.length
    ? await db.execute<{ topic_id: string; hint: string }>(sql`
        select topic_id, hint from (
          select mt.topic_id, m.topic_hint as hint,
            row_number() over (partition by mt.topic_id order by count(*) desc, m.topic_hint) as rank
          from mention_topics mt
          join mentions m on m.id = mt.mention_id
          where mt.topic_id = any(${uuidArraySql(ids)}) and m.is_relevant and m.topic_hint is not null
          group by mt.topic_id, m.topic_hint
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
