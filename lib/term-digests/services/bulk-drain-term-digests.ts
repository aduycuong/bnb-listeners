import { BULK_DRAIN_BATCH_SIZE } from "../constants";
import { claimDigestRows } from "../utils/claim-digest-rows";
import { computeDailyMetrics } from "../utils/compute-daily-metrics";
import { resetStuckWorkers } from "../utils/reset-stuck-workers";
import type { TermDigestJobMetrics } from "../types";

/**
 * QStash handler — runs every 15 minutes via a system schedule.
 *
 * Picks up at most BULK_DRAIN_BATCH_SIZE bulk-stale rows
 * (is_bulk_stale = true) produced by taxonomy restructure operations.
 *
 * The smaller batch limit ensures this job drains gradually without
 * crowding out normal invalidations processed by recompute-term-digests.
 *
 * After computing a row, is_bulk_stale is reset to false so the row is not
 * picked up again in the next bulk-drain run.
 */
export async function bulkDrainTermDigests(): Promise<TermDigestJobMetrics> {
  const startedAt = Date.now();
  await resetStuckWorkers();

  const claimed = await claimDigestRows({
    batchSize: BULK_DRAIN_BATCH_SIZE,
    bulkOnly: true,
  });

  if (claimed.length === 0) {
    return {
      rowsClaimed: 0,
      rowsProcessed: 0,
      batchSize: BULK_DRAIN_BATCH_SIZE,
      durationMs: Date.now() - startedAt,
    };
  }

  await Promise.all(
    claimed.map(({ termId, dateKey, jobId }) =>
      computeDailyMetrics({
        termId,
        dateKey,
        jobId,
        clearBulkStale: true,
      }),
    ),
  );

  return {
    rowsClaimed: claimed.length,
    rowsProcessed: claimed.length,
    batchSize: BULK_DRAIN_BATCH_SIZE,
    durationMs: Date.now() - startedAt,
  };
}
