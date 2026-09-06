import { BULK_DRAIN_BATCH_SIZE } from "../constants";
import type { AffectedDigestPartition } from "../types";
import { claimDigestRows } from "../utils/claim-digest-rows";
import { computeDailyMetrics } from "../utils/compute-daily-metrics";
import { rebuildRollupPeriods } from "../utils/rebuild-rollup-periods";
import { resetStuckWorkers } from "../utils/reset-stuck-workers";

function dedupeAffectedPartitions(
  partitions: AffectedDigestPartition[],
): AffectedDigestPartition[] {
  const seen = new Set<string>();
  const result: AffectedDigestPartition[] = [];

  for (const partition of partitions) {
    const key = `${partition.dateKey}:${partition.groupId}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(partition);
  }

  return result;
}

/**
 * QStash handler — runs every 15 minutes via a system schedule.
 *
 * Picks up at most BULK_DRAIN_BATCH_SIZE bulk-stale rows
 * (is_bulk_stale = true) produced by taxonomy restructure operations.
 *
 * The smaller batch limit ensures this job drains gradually without
 * crowding out normal invalidations processed by recompute-topic-digests.
 *
 * After computing a row, is_bulk_stale is reset to false so the row is not
 * picked up again in the next bulk-drain run.
 */
export async function bulkDrainTopicDigests(): Promise<void> {
  await resetStuckWorkers();

  const claimed = await claimDigestRows({
    batchSize: BULK_DRAIN_BATCH_SIZE,
    bulkOnly: true,
  });

  if (claimed.length === 0) {
    return;
  }

  const affected: AffectedDigestPartition[] = [];

  await Promise.all(
    claimed.map(async ({ topicId, dateKey, groupId }) => {
      await computeDailyMetrics({
        topicId,
        dateKey,
        groupId,
        clearBulkStale: true,
      });
      affected.push({ dateKey, groupId });
    }),
  );

  await rebuildRollupPeriods(dedupeAffectedPartitions(affected));
}
