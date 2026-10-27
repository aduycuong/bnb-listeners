/** `workflowState` values of the Upstash Workflow logs API. */
export const WORKFLOW_RUN_STATES = ["RUN_STARTED", "RUN_SUCCESS", "RUN_FAILED", "RUN_CANCELED"] as const;

/** Event states of the QStash logs API. */
export const JOB_RUN_STATES = [
  "CREATED",
  "ACTIVE",
  "IN_PROGRESS",
  "DELIVERED",
  "RETRY",
  "ERROR",
  "FAILED",
  "CANCELED",
] as const;
