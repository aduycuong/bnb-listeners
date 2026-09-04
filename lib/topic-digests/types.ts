import type { RollupGrain } from "./constants";

// ---------------------------------------------------------------------------
// Shared types for the topic-digest subsystem.
// ---------------------------------------------------------------------------

/** Computed metric values for a single (topic, date) pair. */
export type DigestMetrics = {
  docCount: number;
  avgQualityScore: number | null;
  /** doc_count × avg_quality_score × recency_weight (may be null if no docs). */
  trendScore: number | null;
};

/** A specific rollup period that must be rebuilt after a recompute run. */
export type AffectedPeriod = {
  grain: RollupGrain;
  /** ISO date string YYYY-MM-DD — first day of the period. */
  periodStart: string;
};

/** A claimed daily row returned by the claim query. */
export type ClaimedRow = {
  topicId: string;
  dateKey: string;
};
