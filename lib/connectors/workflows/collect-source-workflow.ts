import type { RouteFunction, WorkflowServeOptions } from "@upstash/workflow";
import { z } from "zod";

import { matchCollectRun } from "@/lib/matching/services/match-collect-run";
import { refreshCollectRunMetricsDaily } from "@/lib/metrics/services/refresh-collect-run-metrics-daily";
import { TRANSCRIPT_CORRECTION_CONFIG } from "@/lib/transcripts/config";
import { correctItemTranscripts } from "@/lib/transcripts/services/correct-item-transcripts";
import { listTranscriptItems } from "@/lib/transcripts/services/list-transcript-items";
import type { CorrectItemTranscriptsResult } from "@/lib/transcripts/types";

import {
  COLLECT_WEBHOOK_TIMEOUT_SECONDS,
  NORMALIZE_BATCH_SIZE,
} from "../constants";
import { createCollectRun } from "../services/create-collect-run";
import { failCollectRun } from "../services/fail-collect-run";
import { finishCollectRun } from "../services/finish-collect-run";
import { normalizeCollectRunBatch } from "../services/normalize-collect-run-batch";
import { runAfterNormalize } from "../services/run-after-normalize";
import { startCollectRun } from "../services/start-collect-run";
import type {
  CollectRunStats,
  CollectSourceWorkflowPayload,
  StoreRawPayloadResult,
} from "../types";
import { getCollectRunEventId } from "../utils/get-collect-run-event-id";
function addCounts(
  total: CorrectItemTranscriptsResult | null,
  batch: CorrectItemTranscriptsResult,
): CorrectItemTranscriptsResult {
  if (!total) return batch;
  return {
    corrected: total.corrected + batch.corrected,
    unchanged: total.unchanged + batch.unchanged,
    current: total.current + batch.current,
    noGlossary: total.noGlossary + batch.noGlossary,
    failed: total.failed + batch.failed,
  };
}

export const collectSourceWorkflowPayloadSchema = z.object({
  collectRunId: z.uuid(),
});

/**
 * Collect → archive → normalize for one `collect_runs` row.
 *
 * 1. start: begin the provider job (or fetch directly).
 * 2. wait-webhook: the provider webhook archives the payload and notifies
 *    this run; no delivery within the timeout fails the run.
 * 3. normalize-{offset}: write the payload into the raw store in batches.
 * 3b. correct-transcripts-{offset}: when items were added, fix misheard names
 *    in their new transcripts (D22), before Match reads them.
 * 4. after-normalize: the connector's post-write hook (schedules, tier, stats).
 * 5. finish, then one step per follow-up run (e.g. comments for refreshed posts).
 * 6. match: incremental Match for projects following the source, when items were added;
 *    Enrich then rewrites L4. A run that only updated items (engagement) rewrites the L4
 *    days of those items instead (D28).
 */
export const collectSourceWorkflow: RouteFunction<
  CollectSourceWorkflowPayload
> = async (context) => {
  const { collectRunId } = context.requestPayload;

  const start = await context.run("start", () =>
    startCollectRun({ collectRunId }),
  );
  if (start.state === "skipped") return;

  let stored: StoreRawPayloadResult | null =
    start.state === "stored" ? start : null;

  if (!stored) {
    const { timeout, eventData } =
      await context.waitForEvent<StoreRawPayloadResult>(
        "wait-webhook",
        getCollectRunEventId(collectRunId),
        { timeout: COLLECT_WEBHOOK_TIMEOUT_SECONDS },
      );

    if (timeout || !eventData) {
      await context.run("fail", () =>
        failCollectRun({
          collectRunId,
          error: `No provider webhook within ${COLLECT_WEBHOOK_TIMEOUT_SECONDS / 3600}h.`,
        }),
      );
      return;
    }

    stored = eventData;
  }

  const { payloadKey, itemCount } = stored;
  const stats: CollectRunStats = { inserted: 0, updated: 0, skipped: 0 };

  for (let offset = 0; offset < itemCount; offset += NORMALIZE_BATCH_SIZE) {
    const batch = await context.run(`normalize-${offset}`, () =>
      normalizeCollectRunBatch({
        collectRunId,
        payloadKey,
        offset,
        limit: NORMALIZE_BATCH_SIZE,
      }),
    );

    stats.inserted += batch.inserted;
    stats.updated += batch.updated;
    stats.skipped += batch.skipped;
  }

  let transcriptCorrection: CorrectItemTranscriptsResult | null = null;
  if (stats.inserted > 0) {
    const itemIds = await context.run("transcripts", () =>
      listTranscriptItems({ collectRunId, uncorrectedOnly: true }),
    );
    for (let offset = 0; offset < itemIds.length; offset += TRANSCRIPT_CORRECTION_CONFIG.itemsPerStep) {
      const batch = await context.run(`correct-transcripts-${offset}`, () =>
        correctItemTranscripts({
          itemIds: itemIds.slice(offset, offset + TRANSCRIPT_CORRECTION_CONFIG.itemsPerStep),
        }),
      );
      transcriptCorrection = addCounts(transcriptCorrection, batch);
    }
  }

  const after = await context.run("after-normalize", () =>
    runAfterNormalize({ collectRunId }),
  );

  await context.run("finish", () =>
    finishCollectRun({
      collectRunId,
      stats: { ...stats, ...after.stats, ...(transcriptCorrection && { transcriptCorrection }) },
    }),
  );

  for (const [index, followUp] of (after.followUps ?? []).entries()) {
    await context.run(`follow-up-${index}`, () => createCollectRun(followUp));
  }

  if (stats.inserted > 0) {
    await context.run("match", () => matchCollectRun({ collectRunId }));
  } else if (stats.updated > 0) {
    await context.run("metrics", () => refreshCollectRunMetricsDaily({ collectRunId }));
  }
};

export const collectSourceWorkflowOptions: WorkflowServeOptions<CollectSourceWorkflowPayload> =
  {
    schema: collectSourceWorkflowPayloadSchema,
    failureFunction: async ({ context, failResponse }) => {
      console.error("[workflow:collect-source] failed", {
        workflowRunId: context.workflowRunId,
        collectRunId: context.requestPayload.collectRunId,
        failResponse,
      });

      await failCollectRun({
        collectRunId: context.requestPayload.collectRunId,
        error: failResponse,
      });
    },
  };
