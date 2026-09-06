import { RECOMPUTE_BATCH_SIZE } from "../constants";
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
 * Picks up at most RECOMPUTE_BATCH_SIZE normal-stale daily rows
 * (is_bulk_stale = false), computes their metrics, then rebuilds all
 * rollup periods affected by that batch.
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

  const affected: AffectedDigestPartition[] = [];

  await Promise.all(
    claimed.map(async ({ topicId, dateKey, groupId }) => {
      await computeDailyMetrics({
        topicId,
        dateKey,
        groupId,
        clearBulkStale: false,
      });
      affected.push({ dateKey, groupId });
    }),
  );

  await rebuildRollupPeriods(dedupeAffectedPartitions(affected));
}
