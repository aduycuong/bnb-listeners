import { eq } from "drizzle-orm";

import { collectRuns } from "@/db/schema";
import { db } from "@/lib/db";
import { updateSourceDetails } from "@/lib/raw-store/services/update-source-details";

import { getCollectRun } from "../utils/get-collect-run";

type FinishCollectRunParams = {
  collectRunId: string;
  stats: { inserted: number; updated: number; skipped: number };
};

type FinishCollectRunResult = {
  /** Lets the workflow attach follow-up runs to the same source without reloading the run. */
  sourceId: string | null;
};

export async function finishCollectRun(
  params: FinishCollectRunParams,
): Promise<FinishCollectRunResult> {
  const run = await getCollectRun(params.collectRunId);
  const finishedAt = new Date();

  await db
    .update(collectRuns)
    .set({ status: "success", stats: params.stats, finishedAt })
    .where(eq(collectRuns.id, run.id));

  if (run.sourceId) {
    await updateSourceDetails({
      sourceId: run.sourceId,
      lastCollectedAt: finishedAt,
    });
  }

  return { sourceId: run.sourceId };
}
