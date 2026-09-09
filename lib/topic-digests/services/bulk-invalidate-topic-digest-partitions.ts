import { sql } from "drizzle-orm";

import { topicDigestDaily } from "@/db/schema";
import type { DigestPartition } from "@/lib/document-topics/types";
import { db } from "@/lib/db";

/**
 * Upsert stale daily digest rows for specific (dateKey, jobId) partitions and
 * route them through the bulk-drain queue (is_bulk_stale = true).
 *
 * Unlike bulkInvalidateTopicDigestsInDateRange, this creates missing rows so
 * newly assigned documents on previously empty days are recomputed.
 */
export async function bulkInvalidateTopicDigestPartitions(params: {
  topicId: string;
  partitions: DigestPartition[];
}): Promise<number> {
  const { topicId, partitions } = params;
  if (partitions.length === 0) {
    return 0;
  }

  const now = new Date();

  await Promise.all(
    partitions.map(({ dateKey, jobId }) =>
      db
        .insert(topicDigestDaily)
        .values({
          topicId,
          dateKey,
          jobId,
          isStale: true,
          isBulkStale: true,
          staleSince: now,
        })
        .onConflictDoUpdate({
          target: [
            topicDigestDaily.topicId,
            topicDigestDaily.dateKey,
            topicDigestDaily.jobId,
          ],
          set: {
            isStale: true,
            isBulkStale: true,
            staleSince: sql`CASE
              WHEN ${topicDigestDaily.processing} THEN now()
              ELSE COALESCE(${topicDigestDaily.staleSince}, now())
            END`,
          },
        }),
    ),
  );

  return partitions.length;
}
