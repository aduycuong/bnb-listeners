import type { WorkflowName } from "./constants";

export type TriggerWorkflowParams = {
  name: WorkflowName;
  body?: unknown;
  /** Stable id makes the trigger idempotent; QStash prefixes it with `wfr_`. */
  workflowRunId?: string;
  /** Seconds to wait before the first step runs. */
  delaySeconds?: number;
  label?: string;
};

export type TriggerWorkflowResult = {
  workflowRunId: string;
};

export type NotifyWorkflowParams = {
  eventId: string;
  eventData?: unknown;
  /** Lets QStash deliver the event even if the run has not started waiting yet. */
  workflowRunId?: string;
};

export type NotifyWorkflowResult = {
  notifiedCount: number;
};
