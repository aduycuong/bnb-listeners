import { processDocument } from "@/lib/documents/services/process-document";
import { scoreDocumentComments } from "@/lib/comments/services/score-document-comments";
import { SCORE_DOCUMENT_COMMENTS_JOB_NAME } from "@/lib/comments/config";
import { runScheduledJob } from "@/lib/jobs/services/run-scheduled-job";
import { scrapeFacebookDocumentComments } from "@/lib/jobs/services/scrape-facebook-document-comments";
import { SCRAPE_FACEBOOK_DOCUMENT_COMMENTS_JOB_NAME } from "@/lib/jobs/handlers/scrape-facebook/config";
import { processTopicBackfillBatch } from "@/lib/topic-backfill/services/process-topic-backfill-batch";
import { bulkDrainTopicDigests } from "@/lib/topic-digests/services/bulk-drain-topic-digests";
import { recomputeTopicDigests } from "@/lib/topic-digests/services/recompute-topic-digests";
import { TOPIC_BACKFILL_QSTASH_JOB_NAME } from "@/lib/topics/topic-backfill-config";
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
  context: QstashJobHandlerContext,
) => Promise<Record<string, unknown> | void> | Record<string, unknown> | void;

/**
 * Registry of QStash job handlers keyed by job name.
 *
 * Add new jobs here, e.g.:
 * "my-job-name": async (payload, ctx) => { ... }
 */
export const qstashJobHandlers: Record<string, QstashJobHandler> = {
  /**
   * Triggered after a document is created.
   * Scores quality dimensions, classifies topics, then chunks and embeds.
   * Payload: { documentId: string }
   */
  "process-document": processDocument,

  /**
   * Triggered after comments are upserted onto a parent post.
   * Noise-filters, batch-scores stance with the LLM, updates debate tallies,
   * and syncs the companion discussion document for retrieval.
   * Payload: { documentId: string }
   */
  [SCORE_DOCUMENT_COMMENTS_JOB_NAME]: scoreDocumentComments,

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

  /**
   * Chained batch worker for topic data backfill.
   * Payload: { runId: string }
   */
  [TOPIC_BACKFILL_QSTASH_JOB_NAME]: processTopicBackfillBatch,

  /**
   * Delayed follow-up scrape for Facebook post comments.
   * Payload: { documentId: string, attempt: number, maxComments: number }
   */
  [SCRAPE_FACEBOOK_DOCUMENT_COMMENTS_JOB_NAME]: scrapeFacebookDocumentComments,
};
