import { eq } from "drizzle-orm";

import { dataSources } from "@/db/schema";
import { APIError } from "@/lib/exposers/api-error";
import { db } from "@/lib/db";
import { buildQstashCron } from "@/lib/qstash/utils/build-qstash-cron";
import { getCallbackUrl } from "@/lib/qstash/utils/get-callback-url";
import { createSchedule } from "@/lib/qstash/services/create-schedule-service";
import { deleteSchedule } from "@/lib/qstash/services/delete-schedule-service";
import { getSchedule } from "@/lib/qstash/services/get-schedule-service";

import { RUN_SCHEDULED_DATA_SOURCE_QSTASH_JOB_NAME } from "../constants";
import type { SyncDataSourceScheduleParams } from "../types";
import { getDataSourceScheduleId } from "../utils/get-data-source-schedule-id";

export async function syncDataSourceSchedule(
  params: SyncDataSourceScheduleParams,
): Promise<void> {
  if (process.env.NODE_ENV !== "production") {
    console.log(
      "Skipping sync dataSource schedule in non-production environment",
      params,
    );
    return;
  }

  const [dataSource] = await db
    .select()
    .from(dataSources)
    .where(eq(dataSources.id, params.dataSourceId))
    .limit(1);

  if (!dataSource) {
    return;
  }

  const scheduleId = getDataSourceScheduleId(dataSource.id);
  const qstashCron = buildQstashCron(dataSource.cronConfig);
  const shouldSchedule = dataSource.enabled && qstashCron !== null;
  const existing = await getSchedule({ scheduleId });

  if (!shouldSchedule) {
    if (existing) {
      await deleteSchedule({ scheduleId });
    }
    return;
  }

  const callbackUrl = getCallbackUrl();

  if (
    existing &&
    existing.cron === qstashCron &&
    existing.destination === callbackUrl
  ) {
    return;
  }

  if (existing) {
    await deleteSchedule({ scheduleId });
  }

  try {
    await createSchedule({
      userId: params.userId,
      jobName: RUN_SCHEDULED_DATA_SOURCE_QSTASH_JOB_NAME,
      payload: { dataSourceId: dataSource.id },
      cron: qstashCron,
      scheduleId,
    });
  } catch (error) {
    console.error("Failed to sync QStash schedule for job", dataSource.id, error);
    throw new APIError(
      "ERR_QSTASH_SCHEDULE_SYNC",
      "Failed to sync dataSource schedule with QStash.",
      502,
    );
  }
}
