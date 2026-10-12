export const CONNECTOR_KEYS = ["facebook-posts", "facebook-comments"] as const;

export type ConnectorKey = (typeof CONNECTOR_KEYS)[number];

export const COLLECT_RUN_STATUSES = [
  "pending",
  "running",
  "success",
  "failed",
] as const;

export type CollectRunStatus = (typeof COLLECT_RUN_STATUSES)[number];

/** Items normalized per workflow step. */
export const NORMALIZE_BATCH_SIZE = 200;

/** A run whose provider webhook has not arrived by then is marked failed. */
export const COLLECT_WEBHOOK_TIMEOUT_SECONDS = 6 * 60 * 60;
