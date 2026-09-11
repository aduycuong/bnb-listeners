export type DigestMetrics = {
  docCount: number;
  avgQualityScore: number | null;
  trendScore: number | null;
};

export type ClaimedRow = {
  termId: string;
  dateKey: string;
  jobId: string;
};

export type TermDigestJobMetrics = {
  rowsClaimed: number;
  rowsProcessed: number;
  batchSize: number;
  durationMs: number;
};
