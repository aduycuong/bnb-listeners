import type { Client } from "@upstash/qstash";

import { ServiceError } from "@/lib/common/service-errors";
import { qstashJobHandlers } from "@/lib/qstash/job-config";
import { syncJobSchedule } from "@/lib/qstash/services/sync-job-schedule";
import { getQstashClient } from "@/lib/qstash/utils/get-qstash-client";
import { isScheduleNotFoundError } from "@/lib/qstash/utils/is-schedule-not-found-error";
import { syncWorkflowSchedule } from "@/lib/workflows/services/sync-workflow-schedule";
import { getScheduleClient } from "@/lib/workflows/utils/get-schedule-client";

import { getManagedSchedule, type ManagedSchedule } from "../config";
import type { SetScheduleEnabledParams, SetScheduleEnabledResult } from "../types";

function clientFor(schedule: ManagedSchedule | null): Client {
  // Same clients as the sync services: workflow schedules follow QSTASH_URL, job schedules do not.
  return schedule?.kind === "job" ? getQstashClient() : getScheduleClient();
}

async function getExisting(client: Client, scheduleId: string) {
  return client.schedules.get(scheduleId).catch((error) => {
    if (isScheduleNotFoundError(error)) return null;
    throw error;
  });
}

async function syncManaged(schedule: ManagedSchedule) {
  if (schedule.kind === "workflow") {
    return syncWorkflowSchedule({
      scheduleId: schedule.scheduleId,
      name: schedule.workflow,
      cron: schedule.cron,
    });
  }

  if (!(schedule.jobName in qstashJobHandlers)) {
    throw new ServiceError("UNKNOWN", `No handler for job ${schedule.jobName} in lib/qstash/job-config.ts.`);
  }
  return syncJobSchedule({
    scheduleId: schedule.scheduleId,
    jobName: schedule.jobName,
    cron: schedule.cron,
  });
}

/**
 * Turns a QStash schedule on or off from the admin. Disabling pauses it, so
 * its history stays. Enabling a schedule of `MANAGED_SCHEDULES` first writes
 * it from code (created when missing, rewritten when its cron, destination or
 * job differs; the destination is this server's URL), then resumes it. Other
 * schedules can only be paused and resumed.
 */
export async function setScheduleEnabled(
  params: SetScheduleEnabledParams,
): Promise<SetScheduleEnabledResult> {
  const managed = getManagedSchedule(params.scheduleId);
  const client = clientFor(managed);

  if (!params.enabled) {
    const existing = await getExisting(client, params.scheduleId);
    if (!existing) return { scheduleId: params.scheduleId, action: "noop", destination: null };

    await client.schedules.pause({ schedule: params.scheduleId });
    return { scheduleId: params.scheduleId, action: "pause", destination: existing.destination };
  }

  if (!managed) {
    const existing = await getExisting(client, params.scheduleId);
    if (!existing) {
      throw new ServiceError("NOT_FOUND", `Schedule ${params.scheduleId} does not exist in QStash.`);
    }

    await client.schedules.resume({ schedule: params.scheduleId });
    return { scheduleId: params.scheduleId, action: "resume", destination: existing.destination };
  }

  const sync = await syncManaged(managed);
  // Resume whatever the sync did: a schedule it left alone may still be paused.
  await client.schedules.resume({ schedule: params.scheduleId });

  return {
    scheduleId: params.scheduleId,
    action: sync.action === "noop" ? "resume" : (sync.action as "create" | "update"),
    destination: sync.destination,
  };
}
