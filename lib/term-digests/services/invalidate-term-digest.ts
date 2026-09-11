import { sql } from "drizzle-orm";

import { termDigestDaily } from "@/db/schema";
import { db } from "@/lib/db";

export type InvalidateTermDigestParams = {
  termId: string;
  /**
   * The date key (YYYY-MM-DD) derived from the document's published_at.
   * Only this specific daily row is invalidated — not the entire term history.
   */
  dateKey: string;
  /** The scrape job that produced the document. */
  jobId: string;
};

/**
 * Mark the (term, date, job) daily row as stale so the recompute job will pick
 * it up on its next run.
 *
 * stale_since is set at the start of a stale episode (COALESCE) so FIFO ordering
 * is preserved across burst invalidations. When the row is already processing,
 * stale_since resets to now() so the row re-queues at the back.
 *
 * Call this whenever a document is assigned to or removed from a term.
 */
export async function invalidateTermDigest(
  params: InvalidateTermDigestParams,
): Promise<void> {
  const { termId, dateKey, jobId } = params;
  const now = new Date();

  await db
    .insert(termDigestDaily)
    .values({
      termId,
      dateKey,
      jobId,
      isStale: true,
      isBulkStale: false,
      staleSince: now,
    })
    .onConflictDoUpdate({
      target: [
        termDigestDaily.termId,
        termDigestDaily.dateKey,
        termDigestDaily.jobId,
      ],
      set: {
        isStale: true,
        staleSince: sql`CASE
          WHEN ${termDigestDaily.processing} THEN now()
          ELSE COALESCE(${termDigestDaily.staleSince}, now())
        END`,
      },
    });
}
