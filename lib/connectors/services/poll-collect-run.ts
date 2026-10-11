import { getConnector } from "../registry";
import type { PollCollectRunResult } from "../types";
import { getCollectRun } from "../utils/get-collect-run";
import { storeRawPayload } from "./store-raw-payload";

type PollCollectRunParams = {
  collectRunId: string;
};

/**
 * Fallback when the provider webhook did not arrive in time: checks the job
 * and, once ready, downloads and archives the result itself.
 */
export async function pollCollectRun(
  params: PollCollectRunParams,
): Promise<PollCollectRunResult> {
  const run = await getCollectRun(params.collectRunId);

  // The webhook stored the payload but its notify was missed.
  if (run.r2Key && run.itemCount !== null) {
    return { state: "stored", r2Key: run.r2Key, itemCount: run.itemCount };
  }

  const connector = getConnector(run.connector);
  if (connector.mode !== "job" || !run.externalJobId) {
    return { state: "failed", error: "Run has no provider job to poll." };
  }

  const status = await connector.getJobStatus(run.externalJobId);
  if (status.state !== "ready") {
    return status;
  }

  const body = await connector.downloadJobResult(run.externalJobId);
  if (body === null) {
    return { state: "running" };
  }

  return { state: "stored", ...(await storeRawPayload({ collectRunId: run.id, body })) };
}
