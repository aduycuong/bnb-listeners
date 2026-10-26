import { getQstashClient } from "../utils/get-qstash-client";
import { getCallbackUrl } from "../utils/get-callback-url";
import { isScheduleNotFoundError } from "../utils/is-schedule-not-found-error";

export type SyncJobScheduleParams = {
  scheduleId: string;
  jobName: string;
  /** QStash cron, `CRON_TZ=…` allowed; null removes the schedule. */
  cron: string | null;
  /** Report the action without calling QStash writes. */
  dryRun?: boolean;
};

export type SyncJobScheduleResult = {
  scheduleId: string;
  jobName: string;
  destination: string;
  cron: string | null;
  /** What QStash has now, when the schedule exists. */
  current: { cron: string; destination: string; jobName: string | null } | null;
  action: "create" | "update" | "delete" | "noop";
  applied: boolean;
};

function jobNameOf(body: string | undefined) {
  try {
    return (JSON.parse(body ?? "") as { jobName?: string }).jobName ?? null;
  } catch {
    return null;
  }
}

/**
 * Makes a QStash schedule call the job callback with `jobName` on a cron: creates it, updates
 * it when the cron, URL or job changed (QStash overwrites a schedule created with the same
 * id), or deletes it. Same idea as `syncWorkflowSchedule`, for `/api/qstash/callback` jobs.
 */
export async function syncJobSchedule(params: SyncJobScheduleParams): Promise<SyncJobScheduleResult> {
  const client = getQstashClient();
  const destination = getCallbackUrl();
  const existing = await client.schedules.get(params.scheduleId).catch((error) => {
    if (isScheduleNotFoundError(error)) return null;
    throw error;
  });
  const current = existing
    ? { cron: existing.cron, destination: existing.destination, jobName: jobNameOf(existing.body) }
    : null;

  const action: SyncJobScheduleResult["action"] =
    params.cron === null
      ? current
        ? "delete"
        : "noop"
      : !current
        ? "create"
        : current.cron === params.cron &&
            current.destination === destination &&
            current.jobName === params.jobName
          ? "noop"
          : "update";

  const result = {
    scheduleId: params.scheduleId,
    jobName: params.jobName,
    destination,
    cron: params.cron,
    current,
    action,
    applied: false,
  };
  if (params.dryRun || action === "noop") return result;

  if (action === "delete") {
    await client.schedules.delete(params.scheduleId);
  } else {
    await client.schedules.create({
      scheduleId: params.scheduleId,
      destination,
      cron: params.cron!,
      body: JSON.stringify({ jobName: params.jobName, payload: {} }),
      headers: { "Content-Type": "application/json" },
    });
  }
  return { ...result, applied: true };
}
