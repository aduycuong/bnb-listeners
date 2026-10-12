import { and, eq, ne } from "drizzle-orm";

import { collectRuns } from "@/db/schema";
import { db } from "@/lib/db";

type FailCollectRunParams = {
  collectRunId: string;
  error: string;
};

/** Marks the run failed unless it already succeeded. */
export async function failCollectRun(params: FailCollectRunParams): Promise<void> {
  await db
    .update(collectRuns)
    .set({
      status: "failed",
      error: params.error.slice(0, 4000),
      finishedAt: new Date(),
    })
    .where(
      and(eq(collectRuns.id, params.collectRunId), ne(collectRuns.status, "success")),
    );
}
