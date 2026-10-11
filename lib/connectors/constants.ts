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

/** How long one wait step listens for the provider webhook before polling. */
export const COLLECT_WAIT_TIMEOUT_SECONDS = 10 * 60;

/** Wait/poll rounds before a job is given up: 36 × 10 min = 6 h. */
export const COLLECT_MAX_WAIT_ROUNDS = 36;
