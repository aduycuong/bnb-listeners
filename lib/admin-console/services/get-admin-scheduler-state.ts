import type { Schedule } from "@upstash/qstash";
import { inArray } from "drizzle-orm";

import { sources } from "@/db/schema";
import { db } from "@/lib/db";
import { COLLECT_CONFIG } from "@/lib/connectors/config";
import { getCollectSettings } from "@/lib/connectors/services/get-collect-settings";
import { dispatchDueRefreshes } from "@/lib/connectors/services/dispatch-due-refreshes";
import { dispatchDueSources } from "@/lib/connectors/services/dispatch-due-sources";
import { getSourceBudgets } from "@/lib/connectors/services/get-source-budgets";
import { getCallbackUrl } from "@/lib/qstash/utils/get-callback-url";
import { getManagedSchedule, MANAGED_SCHEDULES, type ManagedSchedule } from "@/lib/schedules/config";
import { getScheduleClient } from "@/lib/workflows/utils/get-schedule-client";
import { getWorkflowBaseUrl } from "@/lib/workflows/utils/get-workflow-base-url";
import { getWorkflowUrl } from "@/lib/workflows/utils/get-workflow-url";

import type { AdminScheduleRow, AdminSchedulerState } from "../types";
import { toAdminTierRules } from "../utils/to-admin-tier-rules";

function tryUrl(read: () => string): string | null {
  try {
    return read();
  } catch {
    return null;
  }
}

function jobNameOf(body: string | undefined): string | null {
  try {
    return (JSON.parse(body ?? "") as { jobName?: string }).jobName ?? null;
  } catch {
    return null;
  }
}

function expectedDestination(schedule: ManagedSchedule): string | null {
  return schedule.kind === "workflow"
    ? tryUrl(() => getWorkflowUrl(schedule.workflow))
    : tryUrl(getCallbackUrl);
}

function toIso(time: number | undefined): string | null {
  return time ? new Date(time).toISOString() : null;
}

/** Managed schedules joined with what QStash has, then the other QStash schedules. */
async function listQStashSchedules(): Promise<
  Pick<AdminSchedulerState, "schedules" | "schedulesError">
> {
  let existing: Schedule[];
  try {
    existing = await getScheduleClient().schedules.list();
  } catch (error) {
    return {
      schedules: [],
      schedulesError: error instanceof Error ? error.message : String(error),
    };
  }

  const byId = new Map(existing.map((schedule) => [schedule.scheduleId, schedule]));
  const toCurrent = (schedule: Schedule | undefined): AdminScheduleRow["current"] =>
    schedule
      ? {
          cron: schedule.cron,
          destination: schedule.destination,
          jobName: jobNameOf(schedule.body),
          isPaused: schedule.isPaused,
          createdAt: new Date(schedule.createdAt).toISOString(),
          lastScheduleTime: toIso(schedule.lastScheduleTime),
          nextScheduleTime: toIso(schedule.nextScheduleTime),
        }
      : null;

  const managedRows = MANAGED_SCHEDULES.map((schedule): AdminScheduleRow => {
    const current = toCurrent(byId.get(schedule.scheduleId));
    const destination = expectedDestination(schedule);
    const drift: AdminScheduleRow["drift"] = [];

    if (current) {
      if (current.cron !== schedule.cron) drift.push("cron");
      if (destination && current.destination !== destination) drift.push("destination");
      if (schedule.kind === "job" && current.jobName !== schedule.jobName) drift.push("job");
    }

    return {
      scheduleId: schedule.scheduleId,
      managed: {
        label: schedule.label,
        kind: schedule.kind,
        target: schedule.kind === "workflow" ? schedule.workflow : schedule.jobName,
        cron: schedule.cron,
        destination,
      },
      current,
      enabled: current !== null && !current.isPaused,
      drift,
    };
  });

  const otherRows = existing
    .filter((schedule) => !getManagedSchedule(schedule.scheduleId))
    .map((schedule): AdminScheduleRow => ({
      scheduleId: schedule.scheduleId,
      managed: null,
      current: toCurrent(schedule),
      enabled: !schedule.isPaused,
      drift: [],
    }));

  return { schedules: [...managedRows, ...otherRows], schedulesError: null };
}

/**
 * QStash schedules (compared with `MANAGED_SCHEDULES`) plus a dry run of the next `schedule-collections` tick:
 * which sources would get a post run and how many refresh checkpoints are due.
 * Nothing is written.
 */
export async function getAdminSchedulerState(): Promise<AdminSchedulerState> {
  const [budgets, settings] = await Promise.all([getSourceBudgets(), getCollectSettings()]);
  const exhausted = budgets
    .filter((budget) => budget.remaining <= 0)
    .map((budget) => budget.sourceId);

  const [qstash, decisions, refreshes] = await Promise.all([
    listQStashSchedules(),
    dispatchDueSources({ budgets, dryRun: true, settings }),
    dispatchDueRefreshes({ excludeSourceIds: exhausted, dryRun: true }),
  ]);

  const names =
    decisions.length > 0
      ? await db
          .select({ id: sources.id, name: sources.name })
          .from(sources)
          .where(inArray(sources.id, decisions.map((decision) => decision.sourceId)))
      : [];
  const nameById = new Map(names.map((row) => [row.id, row.name]));

  return {
    config: {
      intervalMinutes: COLLECT_CONFIG.scheduler.intervalMinutes,
      tierRules: toAdminTierRules(settings),
      checkpointsHours: settings.commentRefresh.checkpointsHours,
    },
    serverUrl: tryUrl(getWorkflowBaseUrl),
    ...qstash,
    nextTick: {
      sources: decisions.map((decision) => ({
        sourceId: decision.sourceId,
        name: nameById.get(decision.sourceId) ?? null,
        activityTier: decision.activityTier,
        lastRunAt: decision.lastRunAt,
        intervalHours: decision.intervalHours,
        status: decision.status,
        maxRecords: decision.maxRecords ?? null,
      })),
      budgets,
      refreshes: {
        due: refreshes.due,
        runs: refreshes.refreshRuns.map((run) => ({ sourceId: run.sourceId, posts: run.posts })),
      },
    },
  };
}
