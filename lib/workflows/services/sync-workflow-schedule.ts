import { isScheduleNotFoundError } from "@/lib/qstash/utils/is-schedule-not-found-error";

import type { WorkflowName } from "../constants";
import { getScheduleClient } from "../utils/get-schedule-client";
import { getWorkflowUrl } from "../utils/get-workflow-url";

type SyncWorkflowScheduleParams = {
  scheduleId: string;
  name: WorkflowName;
  /** QStash cron (UTC); null removes the schedule. */
  cron: string | null;
  /** Report the action without calling QStash writes. */
  dryRun?: boolean;
};

export type SyncWorkflowScheduleResult = {
  scheduleId: string;
  destination: string;
  cron: string | null;
  action: "create" | "update" | "delete" | "noop";
  applied: boolean;
};

/**
 * Makes a QStash schedule start a workflow run on a cron: creates it, updates
 * it when the cron or URL changed (QStash overwrites a schedule created with
 * the same id), or deletes it.
 */
export async function syncWorkflowSchedule(
  params: SyncWorkflowScheduleParams,
): Promise<SyncWorkflowScheduleResult> {
  const client = getScheduleClient();
  const destination = getWorkflowUrl(params.name);
  const existing = await client.schedules.get(params.scheduleId).catch((error) => {
    if (isScheduleNotFoundError(error)) return null;
    throw error;
  });

  const action: SyncWorkflowScheduleResult["action"] =
    params.cron === null
      ? existing
        ? "delete"
        : "noop"
      : !existing
        ? "create"
        : existing.cron === params.cron && existing.destination === destination
          ? "noop"
          : "update";

  const result = {
    scheduleId: params.scheduleId,
    destination,
    cron: params.cron,
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
      body: "{}",
      headers: { "Content-Type": "application/json" },
    });
  }

  return { ...result, applied: true };
}
