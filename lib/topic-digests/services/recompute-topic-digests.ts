import { RECOMPUTE_BATCH_SIZE } from "../constants";
import { claimDigestRows } from "../utils/claim-digest-rows";
import { computeDailyMetrics } from "../utils/compute-daily-metrics";
import { rebuildRollupPeriods } from "../utils/rebuild-rollup-periods";
import { resetStuckWorkers } from "../utils/reset-stuck-workers";

/**
 * QStash handler — runs every 15 minutes via a system schedule.
 *
 * Picks up at most RECOMPUTE_BATCH_SIZE normal-stale daily rows
 * (is_bulk_stale = false), computes their metrics, then rebuilds all
 * rollup periods affected by that batch.
 *
 * Bulk-stale rows (from taxonomy restructures) are intentionally skipped
 * here — they are handled by bulk-drain-topic-digests with a smaller LIMIT.
 */
export async function recomputeTopicDigests(): Promise<void> {
  // 1. Release any rows stuck in processing by a crashed worker.
  await resetStuckWorkers();

  // 2. Atomically claim a batch of eligible rows.
  const claimed = await claimDigestRows({
    batchSize: RECOMPUTE_BATCH_SIZE,
    bulkOnly: false,
  });

  if (claimed.length === 0) {
    return;
  }

  // 3. Compute metrics for each claimed row.
  const computedDateKeys: string[] = [];

  await Promise.all(
    claimed.map(async ({ topicId, dateKey }) => {
      await computeDailyMetrics({
        topicId,
        dateKey,
        clearBulkStale: false, // normal job does not touch is_bulk_stale
      });
      computedDateKeys.push(dateKey);
    }),
  );

  // 4. Rebuild rollup periods affected by the computed date_keys.
  await rebuildRollupPeriods(computedDateKeys);
}
