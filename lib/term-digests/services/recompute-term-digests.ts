import { RECOMPUTE_BATCH_SIZE } from "../constants";
import { claimDigestRows } from "../utils/claim-digest-rows";
import { computeDailyMetrics } from "../utils/compute-daily-metrics";
import { resetStuckWorkers } from "../utils/reset-stuck-workers";
import type { TermDigestJobMetrics } from "../types";

/**
 * QStash handler — runs every 15 minutes via a system schedule.
 *
 * Picks up at most RECOMPUTE_BATCH_SIZE normal-stale daily rows
 * (is_bulk_stale = false) and computes their metrics.
 *
 * Bulk-stale rows (from taxonomy restructures) are intentionally skipped
 * here — they are handled by bulk-drain-term-digests with a smaller LIMIT.
 */
export async function recomputeTermDigests(): Promise<TermDigestJobMetrics> {
  const startedAt = Date.now();
  await resetStuckWorkers();

  const claimed = await claimDigestRows({
    batchSize: RECOMPUTE_BATCH_SIZE,
    bulkOnly: false,
  });

  if (claimed.length === 0) {
    return {
      rowsClaimed: 0,
      rowsProcessed: 0,
      batchSize: RECOMPUTE_BATCH_SIZE,
      durationMs: Date.now() - startedAt,
    };
  }

  await Promise.all(
    claimed.map(({ termId, dateKey, jobId }) =>
      computeDailyMetrics({
        termId,
        dateKey,
        jobId,
        clearBulkStale: false,
      }),
    ),
  );

  return {
    rowsClaimed: claimed.length,
    rowsProcessed: claimed.length,
    batchSize: RECOMPUTE_BATCH_SIZE,
    durationMs: Date.now() - startedAt,
  };
}
