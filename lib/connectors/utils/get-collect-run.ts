import { eq } from "drizzle-orm";

import { type CollectRun, collectRuns } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";

export async function getCollectRun(collectRunId: string): Promise<CollectRun> {
  const [run] = await db
    .select()
    .from(collectRuns)
    .where(eq(collectRuns.id, collectRunId))
    .limit(1);

  if (!run) {
    throw new NotFoundError("collect run", collectRunId);
  }

  return run;
}
