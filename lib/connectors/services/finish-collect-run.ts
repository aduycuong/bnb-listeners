import { eq } from "drizzle-orm";

import { collectRuns } from "@/db/schema";
import { db } from "@/lib/db";
import { updateSourceDetails } from "@/lib/raw-store/services/update-source-details";

import type { CollectRunStats } from "../types";
import { getCollectRun } from "../utils/get-collect-run";

type FinishCollectRunParams = {
  collectRunId: string;
  stats: CollectRunStats;
};

export async function finishCollectRun(
  params: FinishCollectRunParams,
): Promise<void> {
  const run = await getCollectRun(params.collectRunId);
  const finishedAt = new Date();

  await db
    .update(collectRuns)
    // Keep what the fetch step recorded (e.g. TikHub request counts).
    .set({ status: "success", stats: { ...run.stats, ...params.stats }, finishedAt })
    .where(eq(collectRuns.id, run.id));

  if (run.sourceId) {
    await updateSourceDetails({
      sourceId: run.sourceId,
      lastCollectedAt: finishedAt,
    });
  }
}
