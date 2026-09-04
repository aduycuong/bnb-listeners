// ---------------------------------------------------------------------------
// Topic digest system constants.
//
// DIGEST_DEBOUNCE_MS — how long after the last document assignment before
// a recompute is allowed to run. Prevents bursts from triggering many runs.
//
// Grain-specific recency_weight values control how trend_score is scaled
// relative to the grain. Daily is highest (1.5) because freshness matters
// most; yearly is lowest (0.8) because it spans a long period.
// ---------------------------------------------------------------------------

/** Debounce window before a stale daily row becomes eligible for recompute. */
export const DIGEST_DEBOUNCE_MS = 60 * 60 * 1000; // 1 hour

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
 * Daily grain weight — used in recompute-topic-digests.
 * trend_score = doc_count × avg_quality_score × DAILY_RECENCY_WEIGHT
 */
export const DAILY_RECENCY_WEIGHT = 1.5;

/** Per-grain weights for rollup aggregation. */
export const ROLLUP_RECENCY_WEIGHTS = {
  week: 1.2,
  month: 1.0,
  quarter: 0.9,
  year: 0.8,
} as const;

export type RollupGrain = keyof typeof ROLLUP_RECENCY_WEIGHTS;

export const ROLLUP_GRAINS = Object.keys(
  ROLLUP_RECENCY_WEIGHTS,
) as RollupGrain[];

// ---------------------------------------------------------------------------
// dim_dates column names per grain — used when building rollup SQL.
// ---------------------------------------------------------------------------

/** Maps each grain to its period-start column in dim_dates. */
export const GRAIN_DIM_COLUMN: Record<RollupGrain, string> = {
  week: "week_start",
  month: "month_start",
  quarter: "quarter_start",
  year: "year_start",
};

/** SQL interval to add to period_start to compute period_end. */
export const GRAIN_PERIOD_INTERVAL: Record<RollupGrain, string> = {
  week: "6 days",
  month: "1 month - 1 day",
  quarter: "3 months - 1 day",
  year: "1 year - 1 day",
};
