import { eq, sql } from "drizzle-orm";

import { mentions, topics } from "@/db/schema";
import { db } from "@/lib/db";

/**
 * Deletes every topic of a project so the next run rebuilds them; embeddings
 * are kept. For trials while tuning `TOPIC_CONFIG`.
 */
export async function resetProjectTopics(params: { projectId: string }): Promise<{ topics: number }> {
  const [deleted] = await db.batch([
    db.delete(topics).where(eq(topics.projectId, params.projectId)).returning({ id: topics.id }),
    db
      .update(mentions)
      .set({
        topicStatus: sql`case when ${mentions.topicHint} is null then 'none' else 'pending' end`,
        updatedAt: new Date(),
      })
      .where(eq(mentions.projectId, params.projectId)),
  ]);
  return { topics: deleted.length };
}
