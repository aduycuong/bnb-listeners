// ---------------------------------------------------------------------------
// Shared types for the topic-digest subsystem.
// ---------------------------------------------------------------------------

/** Computed metric values for a single (topic, date, group) partition. */
export type DigestMetrics = {
  docCount: number;
  avgQualityScore: number | null;
  /** doc_count × avg_quality_score × recency_weight (may be null if no docs). */
  trendScore: number | null;
};

/** A claimed daily row returned by the claim query. */
export type ClaimedRow = {
  topicId: string;
  dateKey: string;
  groupId: string;
};
