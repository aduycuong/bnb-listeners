import { eq } from "drizzle-orm";

import { collectRuns } from "@/db/schema";
import { db } from "@/lib/db";

import { LEGACY_IMPORT_CONNECTOR } from "../types";

/**
 * Every legacy import shares one collect run, so re-running the import hits
 * the `(content_item_id, collect_run_id)` unique index instead of piling up
 * engagement snapshots.
 */
export async function getOrCreateLegacyCollectRun(): Promise<string> {
  const [existing] = await db
    .select({ id: collectRuns.id })
    .from(collectRuns)
    .where(eq(collectRuns.connector, LEGACY_IMPORT_CONNECTOR))
    .limit(1);

  if (existing) return existing.id;

  const now = new Date();
  const [created] = await db
    .insert(collectRuns)
    .values({
      connector: LEGACY_IMPORT_CONNECTOR,
      status: "success",
      startedAt: now,
      finishedAt: now,
    })
    .returning({ id: collectRuns.id });

  return created.id;
}
