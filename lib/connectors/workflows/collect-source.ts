import type { RouteFunction, WorkflowServeOptions } from "@upstash/workflow";
import { z } from "zod";

import { COLLECT_MAX_WAIT_ROUNDS, NORMALIZE_BATCH_SIZE } from "../constants";
import { createCollectRun } from "../services/create-collect-run";
import { failCollectRun } from "../services/fail-collect-run";
import { finishCollectRun } from "../services/finish-collect-run";
import { normalizeCollectRunBatch } from "../services/normalize-collect-run-batch";
import { pollCollectRun } from "../services/poll-collect-run";
import { startCollectRun } from "../services/start-collect-run";
import type {
  CollectSourceWorkflowPayload,
  FollowUpRun,
  StoreRawPayloadResult,
} from "../types";
import { getCollectRun } from "../utils/get-collect-run";
import { getCollectRunEventId } from "../utils/get-collect-run-event-id";
import { getCollectWaitTimeoutSeconds } from "../utils/get-collect-wait-timeout-seconds";

export const collectSourceWorkflowPayloadSchema = z.object({
  collectRunId: z.uuid(),
});

/**
 * Collect → archive → normalize for one `collect_runs` row.
 *
 * 1. start: begin the provider job (or fetch directly).
 * 2. wait/poll: wait for the webhook to archive the payload; on timeout,
 *    poll the provider and archive it ourselves.
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

  for (let round = 0; !stored && round < COLLECT_MAX_WAIT_ROUNDS; round++) {
    const { timeout, eventData } =
      await context.waitForEvent<StoreRawPayloadResult>(
        `wait-${round}`,
        getCollectRunEventId(collectRunId),
        { timeout: getCollectWaitTimeoutSeconds() },
      );

    if (!timeout && eventData) {
      stored = eventData;
      break;
    }

    const poll = await context.run(`poll-${round}`, () =>
      pollCollectRun({ collectRunId }),
    );

    if (poll.state === "failed") {
      await context.run("fail", () =>
        failCollectRun({ collectRunId, error: poll.error }),
      );
      return;
    }

    if (poll.state === "stored") stored = poll;
  }

  if (!stored) {
    await context.run("fail", () =>
      failCollectRun({ collectRunId, error: "Timed out waiting for provider." }),
    );
    return;
  }

  const { r2Key, itemCount } = stored;
  const stats = { inserted: 0, updated: 0, skipped: 0 };
  const followUps: FollowUpRun[] = [];

  for (let offset = 0; offset < itemCount; offset += NORMALIZE_BATCH_SIZE) {
    const batch = await context.run(`normalize-${offset}`, () =>
      normalizeCollectRunBatch({
        collectRunId,
        r2Key,
        offset,
        limit: NORMALIZE_BATCH_SIZE,
      }),
    );

    stats.inserted += batch.inserted;
    stats.updated += batch.updated;
    stats.skipped += batch.skipped;
    followUps.push(...batch.followUps);
  }

  await context.run("finish", () => finishCollectRun({ collectRunId, stats }));

  if (followUps.length === 0) return;

  const sourceId = await context.run("load-source", async () => {
    const run = await getCollectRun(collectRunId);
    return run.sourceId;
  });

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
