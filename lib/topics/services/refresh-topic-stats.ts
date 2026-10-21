import { sql } from "drizzle-orm";

import { db } from "@/lib/db";

import { getTopicStage, type TopicStageKind } from "../config";
import { uuidArraySql } from "../utils/topic-sql";

/**
 * Recomputes each group's centroid (mean embedding) and count from its
 * relevant mentions. A group left without relevant mentions keeps its centroid.
 */
export async function refreshTopicStats(params: {
  projectId: string;
  kind?: TopicStageKind;
  /** Limit to these groups; all unmerged groups of the kind otherwise. */
  topicIds?: string[];
}): Promise<{ updated: number }> {
  const spec = getTopicStage(params.kind);
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
        and tp.kind = mt.kind
      join mentions m on m.id = mt.mention_id
      join mention_embeddings e on e.mention_id = mt.mention_id and e.kind = ${spec.embeddingKind}
      where mt.kind = ${spec.kind}
      group by mt.topic_id
    ) s on s.topic_id = t0.id
    where t.id = t0.id
      and t0.project_id = ${params.projectId}::uuid
      and t0.kind = ${spec.kind}
      and t0.status <> 'merged'
      ${params.topicIds ? sql`and t0.id = any(${uuidArraySql(params.topicIds)})` : sql``}
    returning t.id
  `);
  return { updated: rows.length };
}
