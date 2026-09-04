import { BULK_DRAIN_BATCH_SIZE } from "../constants";
import { claimDigestRows } from "../utils/claim-digest-rows";
import { computeDailyMetrics } from "../utils/compute-daily-metrics";
import { rebuildRollupPeriods } from "../utils/rebuild-rollup-periods";
import { resetStuckWorkers } from "../utils/reset-stuck-workers";

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
  // 1. Release any rows stuck in processing by a crashed worker.
  await resetStuckWorkers();

  // 2. Atomically claim a batch of bulk-stale rows only.
  const claimed = await claimDigestRows({
    batchSize: BULK_DRAIN_BATCH_SIZE,
    bulkOnly: true,
  });

  if (claimed.length === 0) {
    return;
  }

  // 3. Compute metrics and clear is_bulk_stale for each row.
  const computedDateKeys: string[] = [];

  await Promise.all(
    claimed.map(async ({ topicId, dateKey }) => {
      await computeDailyMetrics({
        topicId,
        dateKey,
        clearBulkStale: true, // prevent re-claim on next bulk-drain run
      });
      computedDateKeys.push(dateKey);
    }),
  );

  // 4. Rebuild rollup periods affected by the computed date_keys.
  await rebuildRollupPeriods(computedDateKeys);
}
