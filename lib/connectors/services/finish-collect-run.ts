import { eq } from "drizzle-orm";

import { collectRuns } from "@/db/schema";
import { db } from "@/lib/db";
import { updateSourceDetails } from "@/lib/raw-store/services/update-source-details";

import { getCollectRun } from "../utils/get-collect-run";

type FinishCollectRunParams = {
  collectRunId: string;
  stats: { inserted: number; updated: number; skipped: number };
};

export async function finishCollectRun(
  params: FinishCollectRunParams,
): Promise<void> {
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
}
