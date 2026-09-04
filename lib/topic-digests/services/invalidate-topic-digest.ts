import { sql } from "drizzle-orm";

import { topicDigestDaily } from "@/db/schema";
import { db } from "@/lib/db";
import { DIGEST_DEBOUNCE_MS } from "../constants";

export type InvalidateTopicDigestParams = {
  topicId: string;
  /**
   * The date key (YYYY-MM-DD) derived from the document's published_at.
   * Only this specific daily row is invalidated — not the entire topic history.
   */
  dateKey: string;
};

/**
 * Mark the (topic, date) daily row as stale so the recompute job will pick
 * it up on its next run.
 *
 * Uses an upsert with a debounce: if a row already has a future
 * recompute_after, GREATEST(...) preserves the later timestamp so a burst of
 * document assignments doesn't trigger premature recomputes.
 *
 * Call this whenever a document is assigned to or removed from a topic.
 */
export async function invalidateTopicDigest(
  params: InvalidateTopicDigestParams,
): Promise<void> {
  const { topicId, dateKey } = params;
  const debounceMs = DIGEST_DEBOUNCE_MS;
  const recomputeAfter = new Date(Date.now() + debounceMs);

  await db
    .insert(topicDigestDaily)
    .values({
      topicId,
      dateKey,
      isStale: true,
      isBulkStale: false,
      recomputeAfter,
    })
    .onConflictDoUpdate({
      target: [topicDigestDaily.topicId, topicDigestDaily.dateKey],
      set: {
        isStale: true,
        // Preserve the later timestamp — never pull recompute_after forward.
        recomputeAfter: sql`GREATEST(
          ${topicDigestDaily.recomputeAfter},
          ${recomputeAfter.toISOString()}::timestamptz
        )`,
      },
    });
}
