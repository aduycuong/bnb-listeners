import { eq } from "drizzle-orm";

import { jobs } from "@/db/schema";
import { APIError } from "@/lib/exposers/api-error";
import { db } from "@/lib/db";
import { buildQstashCron } from "@/lib/qstash/utils/build-qstash-cron";
import { getCallbackUrl } from "@/lib/qstash/utils/get-callback-url";
import { createSchedule } from "@/lib/qstash/services/create-schedule-service";
import { deleteSchedule } from "@/lib/qstash/services/delete-schedule-service";
import { getSchedule } from "@/lib/qstash/services/get-schedule-service";

import { RUN_SCHEDULED_JOB_QSTASH_JOB_NAME } from "../constants";
import type { SyncJobScheduleParams } from "../types";
import { getJobScheduleId } from "../utils/get-job-schedule-id";

export async function syncJobSchedule(
  params: SyncJobScheduleParams,
): Promise<void> {
  if (process.env.NODE_ENV !== "production") {
    console.log(
      "Skipping sync job schedule in non-production environment",
      params,
    );
    return;
  }

  const [job] = await db
    .select()
    .from(jobs)
    .where(eq(jobs.id, params.jobId))
    .limit(1);

  if (!job) {
    return;
  }

  const scheduleId = getJobScheduleId(job.id);
  const qstashCron = buildQstashCron(job.cronConfig);
  const shouldSchedule = job.enabled && qstashCron !== null;
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
      jobName: RUN_SCHEDULED_JOB_QSTASH_JOB_NAME,
      payload: { jobId: job.id },
      cron: qstashCron,
      scheduleId,
    });
  } catch (error) {
    console.error("Failed to sync QStash schedule for job", job.id, error);
    throw new APIError(
      "ERR_QSTASH_SCHEDULE_SYNC",
      "Failed to sync job schedule with QStash.",
      502,
    );
  }
}
