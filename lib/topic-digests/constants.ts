// ---------------------------------------------------------------------------
// Topic digest system constants.
//
// DAILY_RECENCY_WEIGHT — multiplier applied when computing daily trend_score.
// Kept at 1.5 to emphasise freshness; queries for calendar presets (this_week,
// this_month, …) SUM the stored daily trend_score values directly.
// ---------------------------------------------------------------------------

/** Rows claimed per normal recompute run. */
export const RECOMPUTE_BATCH_SIZE = 200;

/** Rows claimed per bulk-drain run (lower to avoid starving normal queue). */
export const BULK_DRAIN_BATCH_SIZE = 50;

/**
 * A processing row older than this is considered stuck and will be reset at
 * the start of every job run.
 */
export const STUCK_WORKER_TIMEOUT_MINUTES = 30;

// ---------------------------------------------------------------------------
// QStash job names — must match keys in lib/qstash/job-config.ts
// ---------------------------------------------------------------------------

export const RECOMPUTE_JOB_NAME = "recompute-topic-digests";
export const BULK_DRAIN_JOB_NAME = "bulk-drain-topic-digests";

// ---------------------------------------------------------------------------
// Recency weights
// ---------------------------------------------------------------------------

/**
 * Daily grain weight used in computeDailyMetrics.
 * trend_score = doc_count × avg_quality_score × DAILY_RECENCY_WEIGHT
 */
export const DAILY_RECENCY_WEIGHT = 1.5;
