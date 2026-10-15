import { sql } from "drizzle-orm";

import { db } from "@/lib/db";

import { TOPIC_HINT_EMBEDDING_KIND } from "../config";
import { uuidArraySql } from "../utils/topic-sql";

/**
 * Recomputes each topic's centroid (mean embedding) and count from its
 * relevant mentions. A topic left without relevant mentions keeps its centroid.
 */
export async function refreshTopicStats(params: {
  projectId: string;
  /** Limit to these topics; all unmerged topics of the project otherwise. */
  topicIds?: string[];
}): Promise<{ updated: number }> {
  const { rows } = await db.execute<{ id: string }>(sql`
    update topics t
    set centroid = coalesce(s.centroid, t.centroid),
        mention_count = coalesce(s.mentions, 0),
        updated_at = now()
    from topics t0
    left join (
      select mt.topic_id,
        avg(e.embedding) filter (where m.is_relevant) as centroid,
        (count(*) filter (where m.is_relevant))::int as mentions
      from mention_topics mt
      join topics tp on tp.id = mt.topic_id and tp.project_id = ${params.projectId}::uuid
      join mentions m on m.id = mt.mention_id
      join mention_embeddings e on e.mention_id = mt.mention_id and e.kind = ${TOPIC_HINT_EMBEDDING_KIND}
      group by mt.topic_id
    ) s on s.topic_id = t0.id
    where t.id = t0.id
      and t0.project_id = ${params.projectId}::uuid
      and t0.status <> 'merged'
      ${params.topicIds ? sql`and t0.id = any(${uuidArraySql(params.topicIds)})` : sql``}
    returning t.id
  `);
  return { updated: rows.length };
}
