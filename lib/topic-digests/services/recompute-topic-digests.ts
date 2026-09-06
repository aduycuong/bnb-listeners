import { RECOMPUTE_BATCH_SIZE } from "../constants";
import { claimDigestRows } from "../utils/claim-digest-rows";
import { computeDailyMetrics } from "../utils/compute-daily-metrics";
import { resetStuckWorkers } from "../utils/reset-stuck-workers";

/**
 * QStash handler — runs every 15 minutes via a system schedule.
 *
 * Picks up at most RECOMPUTE_BATCH_SIZE normal-stale daily rows
 * (is_bulk_stale = false) and computes their metrics.
 *
 * Bulk-stale rows (from taxonomy restructures) are intentionally skipped
 * here — they are handled by bulk-drain-topic-digests with a smaller LIMIT.
 */
export async function recomputeTopicDigests(): Promise<void> {
  await resetStuckWorkers();

  const claimed = await claimDigestRows({
    batchSize: RECOMPUTE_BATCH_SIZE,
    bulkOnly: false,
  });

  if (claimed.length === 0) {
    return;
  }

  await Promise.all(
    claimed.map(({ topicId, dateKey, groupId }) =>
      computeDailyMetrics({
        topicId,
        dateKey,
        groupId,
        clearBulkStale: false,
      }),
    ),
  );
}
