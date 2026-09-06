import { sql } from "drizzle-orm";

import { topicDigestDaily } from "@/db/schema";
import { db } from "@/lib/db";

export type InvalidateTopicDigestParams = {
  topicId: string;
  /**
   * The date key (YYYY-MM-DD) derived from the document's published_at.
   * Only this specific daily row is invalidated — not the entire topic history.
   */
  dateKey: string;
  /** A source_groups.id — the group the document belongs to. */
  groupId: string;
};

/**
 * Mark the (topic, date, group) daily row as stale so the recompute job will pick
 * it up on its next run.
 *
 * stale_since is set at the start of a stale episode (COALESCE) so FIFO ordering
 * is preserved across burst invalidations. When the row is already processing,
 * stale_since resets to now() so the row re-queues at the back.
 *
 * Call this whenever a document is assigned to or removed from a topic.
 */
export async function invalidateTopicDigest(
  params: InvalidateTopicDigestParams,
): Promise<void> {
  const { topicId, dateKey, groupId } = params;
  const now = new Date();

  await db
    .insert(topicDigestDaily)
    .values({
      topicId,
      dateKey,
      groupId,
      isStale: true,
      isBulkStale: false,
      staleSince: now,
    })
    .onConflictDoUpdate({
      target: [
        topicDigestDaily.topicId,
        topicDigestDaily.dateKey,
        topicDigestDaily.groupId,
      ],
      set: {
        isStale: true,
        staleSince: sql`CASE
          WHEN ${topicDigestDaily.processing} THEN now()
          ELSE COALESCE(${topicDigestDaily.staleSince}, now())
        END`,
      },
    });
}
