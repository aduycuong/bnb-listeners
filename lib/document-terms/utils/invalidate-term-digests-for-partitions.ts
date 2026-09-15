import { invalidateTermDigest } from "@/lib/term-digests/services/invalidate-term-digest";

import type { DigestPartition } from "../types";

/**
 * Upsert stale daily digest rows for every (dateKey, dataSourceId) partition on the
 * given term.
 */
export async function invalidateTermDigestsForPartitions(
  termId: string,
  partitions: DigestPartition[],
): Promise<number> {
  if (partitions.length === 0) {
    return 0;
  }

  await Promise.all(
    partitions.map(({ dateKey, dataSourceId }) =>
      invalidateTermDigest({ termId, dateKey, dataSourceId }),
    ),
  );

  return partitions.length;
}
