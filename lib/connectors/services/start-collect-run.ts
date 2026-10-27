import { eq } from "drizzle-orm";

import { collectRuns } from "@/db/schema";
import { db } from "@/lib/db";
import { countTikHubRequests } from "@/lib/tikhub/utils/count-tikhub-requests";

import { getConnector } from "../registry";
import type { StartCollectRunResult } from "../types";
import { getCollectRun } from "../utils/get-collect-run";
import { storeRawPayload } from "./store-raw-payload";

type StartCollectRunParams = {
  collectRunId: string;
};

function readRequests(stats: Record<string, unknown> | null): number {
  const requests = stats?.requests;
  return typeof requests === "number" ? requests : 0;
}

/** First workflow step: marks the run running and starts collection. */
export async function startCollectRun(
  params: StartCollectRunParams,
): Promise<StartCollectRunResult> {
  const run = await getCollectRun(params.collectRunId);

  if (run.status === "success" || run.status === "failed") {
    return { state: "skipped", reason: `run already ${run.status}` };
  }

  // A retried step must not start a second provider job.
  if (run.externalJobId) {
    return { state: "job-started", externalJobId: run.externalJobId };
  }

  // Nor fetch a direct connector's records again (TikHub bills each request):
  // the payload is stored before this step returns.
  if (run.payloadKey && run.itemCount !== null) {
    return { state: "stored", payloadKey: run.payloadKey, itemCount: run.itemCount };
  }

  const connector = getConnector(run.connector);
  const connectorParams = connector.paramsSchema.parse(run.params);
  const context = { collectRunId: run.id, sourceId: run.sourceId };

  await db
    .update(collectRuns)
    .set({ status: "running", startedAt: new Date() })
    .where(eq(collectRuns.id, run.id));

  if (connector.mode === "direct") {
    // TikHub requests of earlier attempts that threw are billed too: keep
    // their count and add this attempt's, whether it succeeds or not.
    const earlierRequests = readRequests(run.stats);
    const counter = { requests: 0 };
    let fetched: Awaited<ReturnType<typeof connector.fetchRecords>>;

    try {
      fetched = await countTikHubRequests(counter, () =>
        connector.fetchRecords(connectorParams, context),
      );
    } catch (error) {
      if (counter.requests > 0) {
        await db
          .update(collectRuns)
          .set({ stats: { ...run.stats, requests: earlierRequests + counter.requests } })
          .where(eq(collectRuns.id, run.id));
      }
      throw error;
    }

    const { records, stats: fetchStats } = Array.isArray(fetched)
      ? { records: fetched, stats: undefined }
      : fetched;
    const requests = earlierRequests + counter.requests;
    const stats = requests > 0 ? { ...fetchStats, requests } : fetchStats;

    const stored = await storeRawPayload({
      collectRunId: run.id,
      body: JSON.stringify(records),
    });

    if (stats) {
      await db
        .update(collectRuns)
        .set({ stats })
        .where(eq(collectRuns.id, run.id));
    }

    return { state: "stored", ...stored };
  }

  const externalJobId = await connector.startJob(connectorParams, context);

  await db
    .update(collectRuns)
    .set({ externalJobId })
    .where(eq(collectRuns.id, run.id));

  return { state: "job-started", externalJobId };
}
