import { and, inArray } from "drizzle-orm";

import { aiReports, projects } from "@/db/schema";
import { db } from "@/lib/db";

import { REPORT_SCHEDULE_PERIODS } from "../config";
import { lastClosedPeriodStart } from "../utils/last-closed-period";

export type DueReport = {
  projectId: string;
  projectName: string;
  periodType: (typeof REPORT_SCHEDULE_PERIODS)[keyof typeof REPORT_SCHEDULE_PERIODS];
  periodStart: string;
};

/** Today's date key (`YYYY-MM-DD`) in a timezone. */
function todayKey(timezone: string, now: Date) {
  return now.toLocaleDateString("en-CA", { timeZone: timezone });
}

/**
 * Reports the hourly job should generate (D29): for each project with a `reportSchedule`, the
 * last period of that schedule that has ended in the project's timezone, when it has no report
 * yet. A project without a saved schedule uses the default `weekly`, as its settings show.
 */
export async function findDueReports(now = new Date()): Promise<DueReport[]> {
  const rows = await db
    .select({
      id: projects.id,
      name: projects.name,
      timezone: projects.timezone,
      notificationConfig: projects.notificationConfig,
    })
    .from(projects);

  const candidates = rows.flatMap((row) => {
    const schedule = row.notificationConfig?.reportSchedule ?? "weekly";
    if (!(schedule in REPORT_SCHEDULE_PERIODS)) return [];
    const periodType = REPORT_SCHEDULE_PERIODS[schedule as keyof typeof REPORT_SCHEDULE_PERIODS];
    return [
      {
        projectId: row.id,
        projectName: row.name,
        periodType,
        periodStart: lastClosedPeriodStart(periodType, todayKey(row.timezone, now)),
      },
    ];
  });
  if (candidates.length === 0) return [];

  const existing = await db
    .select({
      projectId: aiReports.projectId,
      periodType: aiReports.periodType,
      periodStart: aiReports.periodStart,
    })
    .from(aiReports)
    .where(
      and(
        inArray(aiReports.projectId, candidates.map((item) => item.projectId)),
        inArray(aiReports.periodType, [...new Set(candidates.map((item) => item.periodType))]),
      ),
    );
  const done = new Set(existing.map((row) => `${row.projectId}|${row.periodType}|${row.periodStart}`));

  return candidates.filter(
    (item) => !done.has(`${item.projectId}|${item.periodType}|${item.periodStart}`),
  );
}
