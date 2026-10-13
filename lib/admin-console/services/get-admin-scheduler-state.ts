import { inArray } from "drizzle-orm";

import { sources } from "@/db/schema";
import { db } from "@/lib/db";
import { COLLECT_CONFIG } from "@/lib/connectors/config";
import { dispatchDueRefreshes } from "@/lib/connectors/services/dispatch-due-refreshes";
import { dispatchDueSources } from "@/lib/connectors/services/dispatch-due-sources";
import { getSourceBudgets } from "@/lib/connectors/services/get-source-budgets";
import { getScheduleClient } from "@/lib/workflows/utils/get-schedule-client";

import type { AdminSchedulerState } from "../types";

async function listQStashSchedules(): Promise<
  Pick<AdminSchedulerState, "schedules" | "schedulesError">
> {
  try {
    const schedules = await getScheduleClient().schedules.list();
    return {
      schedules: schedules.map((schedule) => ({
        scheduleId: schedule.scheduleId,
        cron: schedule.cron,
        destination: schedule.destination,
        isPaused: schedule.isPaused,
        createdAt: new Date(schedule.createdAt).toISOString(),
        lastScheduleTime: schedule.lastScheduleTime
          ? new Date(schedule.lastScheduleTime).toISOString()
          : null,
        nextScheduleTime: schedule.nextScheduleTime
          ? new Date(schedule.nextScheduleTime).toISOString()
          : null,
      })),
      schedulesError: null,
    };
  } catch (error) {
    return {
      schedules: [],
      schedulesError: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * QStash schedules plus a dry run of the next `schedule-collections` tick:
 * which sources would get a post run and how many refresh checkpoints are due.
 * Nothing is written.
 */
export async function getAdminSchedulerState(): Promise<AdminSchedulerState> {
  const budgets = await getSourceBudgets();
  const exhausted = budgets
    .filter((budget) => budget.remaining <= 0)
    .map((budget) => budget.sourceId);

  const [qstash, decisions, refreshes] = await Promise.all([
    listQStashSchedules(),
    dispatchDueSources({ budgets, dryRun: true }),
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
      tierIntervalHours: COLLECT_CONFIG.tiers.intervalHours,
      checkpointsHours: COLLECT_CONFIG.commentRefresh.checkpointsHours,
    },
    ...qstash,
    nextTick: {
      sources: decisions.map((decision) => ({
        sourceId: decision.sourceId,
        name: nameById.get(decision.sourceId) ?? null,
        activityTier: decision.activityTier,
        lastRunAt: decision.lastRunAt,
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
