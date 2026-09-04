import { processDocument } from "@/lib/documents/services/process-document";
import { runScheduledJob } from "@/lib/jobs/services/run-scheduled-job";
import { bulkDrainTopicDigests } from "@/lib/topic-digests/services/bulk-drain-topic-digests";
import { recomputeTopicDigests } from "@/lib/topic-digests/services/recompute-topic-digests";
import {
  BULK_DRAIN_JOB_NAME,
  RECOMPUTE_JOB_NAME,
} from "@/lib/topic-digests/constants";

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

  /**
   * System cron — every 15 minutes.
   * Picks up normal-stale daily digest rows (is_bulk_stale = false) and
   * recomputes doc_count, avg_quality_score, trend_score, then rebuilds
   * affected rollup periods and re-ranks within each workspace.
   * No payload required.
   */
  [RECOMPUTE_JOB_NAME]: recomputeTopicDigests,

  /**
   * System cron — every 15 minutes, lower priority.
   * Drains bulk-stale rows (is_bulk_stale = true) produced by taxonomy
   * restructures. Uses a smaller batch limit to avoid starving the normal
   * recompute queue.
   * No payload required.
   */
  [BULK_DRAIN_JOB_NAME]: bulkDrainTopicDigests,
};
