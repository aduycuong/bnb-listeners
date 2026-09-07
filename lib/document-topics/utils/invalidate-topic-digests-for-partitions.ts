import { invalidateTopicDigest } from "@/lib/topic-digests/services/invalidate-topic-digest";

import type { DigestPartition } from "../types";

/**
 * Upsert stale daily digest rows for every (dateKey, jobId) partition on the
 * given topic.
 */
export async function invalidateTopicDigestsForPartitions(
  topicId: string,
  partitions: DigestPartition[],
): Promise<number> {
  if (partitions.length === 0) {
    return 0;
  }

  await Promise.all(
    partitions.map(({ dateKey, jobId }) =>
      invalidateTopicDigest({ topicId, dateKey, jobId }),
    ),
  );

  return partitions.length;
}
