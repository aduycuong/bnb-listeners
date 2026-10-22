export const CONNECTOR_KEYS = [
  "facebook-posts",
  "facebook-post-refresh",
  "facebook-comments",
  "tiktok-posts",
  "tiktok-search",
  "tiktok-post-refresh",
  "tiktok-comments",
  "synthetic-threads",
] as const;

export type ConnectorKey = (typeof CONNECTOR_KEYS)[number];

/** Connectors that scan a source for new posts; the scheduler runs these per source. */
export const POST_CONNECTOR_KEYS = [
  "facebook-posts",
  "tiktok-posts",
  "tiktok-search",
] as const satisfies readonly ConnectorKey[];

export type PostConnectorKey = (typeof POST_CONNECTOR_KEYS)[number];

export const COLLECT_RUN_STATUSES = [
  "pending",
  "running",
  "success",
  "failed",
] as const;

export type CollectRunStatus = (typeof COLLECT_RUN_STATUSES)[number];

export const ACTIVITY_TIERS = ["hot", "normal", "low", "paused"] as const;

export type ActivityTier = (typeof ACTIVITY_TIERS)[number];

/** Items normalized per workflow step. */
export const NORMALIZE_BATCH_SIZE = 200;

/** A run whose provider webhook has not arrived by then is marked failed. */
export const COLLECT_WEBHOOK_TIMEOUT_SECONDS = 6 * 60 * 60;
