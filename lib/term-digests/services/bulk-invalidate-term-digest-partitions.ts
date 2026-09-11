import { sql } from "drizzle-orm";

import { termDigestDaily } from "@/db/schema";
import type { DigestPartition } from "@/lib/document-terms/types";
import { db } from "@/lib/db";

/**
 * Upsert stale daily digest rows for specific (dateKey, jobId) partitions and
 * route them through the bulk-drain queue (is_bulk_stale = true).
 *
 * Unlike bulkInvalidateTermDigestsInDateRange, this creates missing rows so
 * newly assigned documents on previously empty days are recomputed.
 */
export async function bulkInvalidateTermDigestPartitions(params: {
  termId: string;
  partitions: DigestPartition[];
}): Promise<number> {
  const { termId, partitions } = params;
  if (partitions.length === 0) {
    return 0;
  }

  const now = new Date();

  await Promise.all(
    partitions.map(({ dateKey, jobId }) =>
      db
        .insert(termDigestDaily)
        .values({
          termId,
          dateKey,
          jobId,
          isStale: true,
          isBulkStale: true,
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
            isBulkStale: true,
            staleSince: sql`CASE
              WHEN ${termDigestDaily.processing} THEN now()
              ELSE COALESCE(${termDigestDaily.staleSince}, now())
            END`,
          },
        }),
    ),
  );

  return partitions.length;
}
