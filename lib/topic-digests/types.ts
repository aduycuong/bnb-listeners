export type DigestMetrics = {
  docCount: number;
  avgQualityScore: number | null;
  trendScore: number | null;
};

export type ClaimedRow = {
  topicId: string;
  dateKey: string;
  jobId: string;
};

export type TopicDigestJobMetrics = {
  rowsClaimed: number;
  rowsProcessed: number;
  batchSize: number;
  durationMs: number;
};
