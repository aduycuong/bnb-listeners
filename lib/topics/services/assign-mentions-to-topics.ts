import { sql } from "drizzle-orm";

import { db } from "@/lib/db";

import { TOPIC_CONFIG } from "../config";
import type { AssignMentionsResult } from "../types";
import { currentEmbeddingSql, eligibleMentionSql } from "../utils/topic-sql";

/**
 * Puts each embedded mention without a topic into the nearest active or
 * hidden topic when similar enough; the rest wait for a new topic (D15).
 */
export async function assignMentionsToTopics(params: {
  projectId: string;
}): Promise<AssignMentionsResult> {
  const { rows } = await db.execute<{ status: string; previous: string }>(sql`
    with candidates as (
      select m.id as mention_id, m.topic_status as previous, e.embedding
      from mentions m
      join mention_embeddings e on ${currentEmbeddingSql()}
      where ${eligibleMentionSql(params.projectId)}
        and m.topic_status in ('pending', 'unassigned')
    ),
    best as (
      select c.mention_id, t.id as topic_id, 1 - (t.centroid <=> c.embedding) as similarity
      from candidates c
      cross join lateral (
        select t.id, t.centroid
        from topics t
        where t.project_id = ${params.projectId}::uuid
          and t.status in ('active', 'hidden')
          and t.centroid is not null
        order by t.centroid <=> c.embedding
        limit 1
      ) t
    ),
    inserted as (
      insert into mention_topics (mention_id, topic_id, confidence)
      select mention_id, topic_id, similarity from best
      where similarity >= ${TOPIC_CONFIG.assignSimilarity}
      on conflict (mention_id) do update
        set topic_id = excluded.topic_id, confidence = excluded.confidence, created_at = now()
      returning mention_id
    ),
    updated as (
      update mentions
      set topic_status = case when id in (select mention_id from inserted) then 'assigned' else 'unassigned' end,
          updated_at = now()
      where id in (select mention_id from candidates)
      returning id, topic_status
    )
    select u.topic_status as status, c.previous
    from updated u
    join candidates c on c.mention_id = u.id
  `);

  const assigned = rows.filter((row) => row.status === "assigned").length;
  return {
    assigned,
    waiting: rows.length - assigned,
    newlyWaiting: rows.filter((row) => row.status === "unassigned" && row.previous === "pending").length,
  };
}
