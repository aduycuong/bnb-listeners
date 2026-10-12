import type { RouteFunction, WorkflowServeOptions } from "@upstash/workflow";
import { z } from "zod";

import {
  COLLECT_WEBHOOK_TIMEOUT_SECONDS,
  NORMALIZE_BATCH_SIZE,
} from "../constants";
import { createCollectRun } from "../services/create-collect-run";
import { failCollectRun } from "../services/fail-collect-run";
import { finishCollectRun } from "../services/finish-collect-run";
import { normalizeCollectRunBatch } from "../services/normalize-collect-run-batch";
import { startCollectRun } from "../services/start-collect-run";
import type {
  CollectSourceWorkflowPayload,
  FollowUpRun,
  StoreRawPayloadResult,
} from "../types";
import { getCollectRunEventId } from "../utils/get-collect-run-event-id";

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
 * 4. finish, then one step per follow-up run (e.g. comments for new posts).
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
  const stats = { inserted: 0, updated: 0, skipped: 0 };
  const followUps: FollowUpRun[] = [];

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
    followUps.push(...batch.followUps);
  }

  const { sourceId } = await context.run("finish", () =>
    finishCollectRun({ collectRunId, stats }),
  );

  for (const [index, followUp] of followUps.entries()) {
    await context.run(`follow-up-${index}`, () =>
      createCollectRun({ ...followUp, sourceId }),
    );
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
