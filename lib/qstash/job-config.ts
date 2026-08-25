import { processDocument } from "@/lib/documents/services/process-document";
import { runScheduledJob } from "@/lib/jobs/services/run-scheduled-job";

import { RUN_SCHEDULED_JOB_QSTASH_JOB_NAME } from "@/lib/jobs/constants";

export type QstashJobHandlerContext = {
  userId?: string;
};

export type QstashJobHandler = (
  payload: unknown,
  context: QstashJobHandlerContext
) => Promise<void> | void;

/**
 * Registry of QStash job handlers keyed by job name.
 *
 * Add new jobs here, e.g.:
 * "my-job-name": async (payload, ctx) => { ... }
 */
export const qstashJobHandlers: Record<string, QstashJobHandler> = {
  /**
   * Triggered after a document is created.
   * Scores quality dimensions and detects near-duplicates.
   * Payload: { documentId: string }
   */
  "process-document": processDocument,

  /**
   * Fired by QStash on a workspace job's cron schedule.
   * Payload: { jobId: string }
   */
  [RUN_SCHEDULED_JOB_QSTASH_JOB_NAME]: runScheduledJob,
};
