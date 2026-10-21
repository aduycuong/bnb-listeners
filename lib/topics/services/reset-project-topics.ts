import { and, eq, sql } from "drizzle-orm";

import { topics } from "@/db/schema";
import { db } from "@/lib/db";

import { getTopicStage } from "../config";
import type { TopicRunParams } from "../types";

/**
 * Deletes every group of one kind so the next run rebuilds them;
 * embeddings are kept. For trials while tuning `TOPIC_CONFIG`.
 */
export async function resetProjectTopics(params: TopicRunParams): Promise<{ topics: number }> {
  const spec = getTopicStage(params.kind);
  const [deleted] = await db.batch([
    db
      .delete(topics)
      .where(and(eq(topics.projectId, params.projectId), eq(topics.kind, spec.kind)))
      .returning({ id: topics.id }),
    db.execute(sql`
      update mention_enrichments me
      set status = 'pending', error = null, updated_at = now()
      from mentions m
      where m.id = me.mention_id
        and m.project_id = ${params.projectId}
        and me.enricher_key = ${spec.enricherKey}
        and me.status <> 'pending'
    `),
  ]);
  return { topics: deleted.length };
}
