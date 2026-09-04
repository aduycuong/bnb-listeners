import { sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { STUCK_WORKER_TIMEOUT_MINUTES } from "../constants";

/**
 * Reset daily rows that have been stuck in processing state for longer than
 * STUCK_WORKER_TIMEOUT_MINUTES. Should run at the start of every recompute
 * or bulk-drain job run to recover from crashed workers.
 */
export async function resetStuckWorkers(): Promise<void> {
  await db.execute(sql`
    UPDATE topic_digest_daily
    SET processing = false, processing_started_at = NULL
    WHERE processing = true
      AND processing_started_at < now() - (${STUCK_WORKER_TIMEOUT_MINUTES} || ' minutes')::interval
  `);
}
