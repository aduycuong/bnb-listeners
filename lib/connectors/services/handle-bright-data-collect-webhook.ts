import { notifyWorkflow } from "@/lib/workflows/services/notify-workflow";

import type { StoreRawPayloadResult } from "../types";
import { getCollectRun } from "../utils/get-collect-run";
import { getCollectRunEventId } from "../utils/get-collect-run-event-id";
import { storeRawPayload } from "./store-raw-payload";

type HandleBrightDataCollectWebhookParams = {
  collectRunId: string;
  /** Raw request body, archived as-is. */
  body: string;
};

/**
 * Archives the delivered payload and wakes the waiting workflow. Late or
 * duplicate deliveries for a finished run are ignored.
 */
export async function handleBrightDataCollectWebhook(
  params: HandleBrightDataCollectWebhookParams,
): Promise<{ ok: true }> {
  const run = await getCollectRun(params.collectRunId);

  if (run.status !== "running") {
    return { ok: true };
  }

  const stored: StoreRawPayloadResult = await storeRawPayload({
    collectRunId: run.id,
    body: params.body,
  });

  await notifyWorkflow({
    eventId: getCollectRunEventId(run.id),
    eventData: stored,
    workflowRunId: run.workflowRunId ?? undefined,
  });

  return { ok: true };
}
