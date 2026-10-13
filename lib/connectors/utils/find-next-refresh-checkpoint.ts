import { COLLECT_CONFIG } from "../config";

const HOUR_MS = 60 * 60 * 1000;

type FindNextRefreshCheckpointParams = {
  publishedAt: Date;
  now: Date;
};

type RefreshCheckpoint = {
  checkpointHours: number;
  dueAt: Date;
};

/**
 * Earliest configured checkpoint still in the future, so a post that is
 * already past a checkpoint skips to the next one. Checkpoints are absolute
 * times, so calling this twice after processing one gives the same answer.
 * Null when none is left.
 */
export function findNextRefreshCheckpoint(
  params: FindNextRefreshCheckpointParams,
): RefreshCheckpoint | null {
  for (const hours of COLLECT_CONFIG.commentRefresh.checkpointsHours) {
    const dueAt = new Date(params.publishedAt.getTime() + hours * HOUR_MS);
    if (dueAt > params.now) return { checkpointHours: hours, dueAt };
  }

  return null;
}
