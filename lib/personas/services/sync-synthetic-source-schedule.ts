import { eq } from "drizzle-orm";

import { sources } from "@/db/schema";
import { db } from "@/lib/db";
import { syncJobSchedule } from "@/lib/qstash/services/sync-job-schedule";
import { buildQstashCron } from "@/lib/qstash/utils/build-qstash-cron";

import { RUN_SYNTHETIC_SOURCE_JOB_NAME } from "../config";
import { getSyntheticSourceScheduleId } from "../utils/get-synthetic-source-schedule-id";
import { readSyntheticSourceConfig } from "../utils/read-synthetic-source-config";

export type SyncSyntheticSourceScheduleResult = {
  scheduleId: string;
  cron: string | null;
  action: "create" | "update" | "delete" | "noop";
};

/**
 * Makes the QStash schedule of a synthetic source match its config: on while
 * the source exists, is synthetic, has a valid enabled config and is not
 * paused; removed otherwise. Call it whenever any of these may have changed.
 */
export async function syncSyntheticSourceSchedule(
  sourceId: string,
): Promise<SyncSyntheticSourceScheduleResult> {
  const [source] = await db
    .select({
      origin: sources.origin,
      activityTier: sources.activityTier,
      metadata: sources.metadata,
    })
    .from(sources)
    .where(eq(sources.id, sourceId))
    .limit(1);

  const config = source ? readSyntheticSourceConfig(source.metadata) : null;
  const eligible =
    source?.origin === "synthetic" && source.activityTier !== "paused" && config?.enabled;
  const cron = eligible ? buildQstashCron(config!.cronConfig) : null;

  const result = await syncJobSchedule({
    scheduleId: getSyntheticSourceScheduleId(sourceId),
    jobName: RUN_SYNTHETIC_SOURCE_JOB_NAME,
    cron,
    payload: { sourceId },
  });

  return { scheduleId: result.scheduleId, cron, action: result.action };
}
