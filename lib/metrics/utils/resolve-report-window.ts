import { sql, type SQL } from "drizzle-orm";

import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";

import type { ReportPeriod, ReportPeriodInfo } from "../types";
import { addDays, resolvePeriodDates } from "./resolve-period-dates";

export type ReportWindow = {
  timezone: string;
  /** Start of the first day of the period, in the project's timezone. */
  start: Date;
  /** Start of the day after the period. */
  end: Date;
  previousStart: Date;
  previousEnd: Date;
  /** Days of the period as `YYYY-MM-DD`, oldest first. */
  dates: string[];
  info: ReportPeriodInfo;
};

/**
 * The report period of a project in its timezone (D28) and the period compared against.
 * Mentions of the period are `published_at >= start and < end`; use `periodSql`.
 */
export async function resolveReportWindow(
  projectId: string,
  period: ReportPeriod,
): Promise<ReportWindow> {
  const { rows: projectRows } = await db.execute<{ timezone: string; today: string }>(sql`
    select timezone, to_char(now() at time zone timezone, 'YYYY-MM-DD') as today
    from projects where id = ${projectId}::uuid
  `);
  const project = projectRows[0];
  if (!project) throw new NotFoundError("Project", projectId);

  const dates = resolvePeriodDates(period, project.today);
  const tz = project.timezone;
  const { rows } = await db.execute<{
    period_start: string;
    period_end: string;
    previous_start: string;
    previous_end: string;
  }>(sql`
    select ${dates.start}::timestamp at time zone ${tz} as period_start,
      ${dates.end}::timestamp at time zone ${tz} as period_end,
      ${dates.previousStart}::timestamp at time zone ${tz} as previous_start,
      ${dates.previousEnd}::timestamp at time zone ${tz} as previous_end
  `);
  const row = rows[0];

  return {
    timezone: tz,
    start: new Date(row.period_start),
    end: new Date(row.period_end),
    previousStart: new Date(row.previous_start),
    previousEnd: new Date(row.previous_end),
    dates: Array.from({ length: dates.days }, (_, index) => addDays(dates.start, index)),
    info: {
      ...dates,
      end: addDays(dates.end, -1),
      previousEnd: addDays(dates.previousEnd, -1),
    },
  };
}

function timestampSql(date: Date) {
  return sql`${date.toISOString()}::timestamptz`;
}

/** Filters of a timestamp column (default `m.published_at`) on the period and the one before. */
export function periodSql(window: ReportWindow, column: SQL = sql`m.published_at`) {
  const current = sql`(${column} >= ${timestampSql(window.start)} and ${column} < ${timestampSql(window.end)})`;
  const previous = sql`(${column} >= ${timestampSql(window.previousStart)} and ${column} < ${timestampSql(window.previousEnd)})`;
  return { current, previous, either: sql`(${current} or ${previous})` };
}

/** Filters of a day column (default `d.date_key`, L4) on the period and the one before. */
export function periodDateSql(window: ReportWindow, column: SQL = sql`d.date_key`) {
  const { start, end, previousStart, previousEnd } = window.info;
  const current = sql`(${column} between ${start}::date and ${end}::date)`;
  const previous = sql`(${column} between ${previousStart}::date and ${previousEnd}::date)`;
  return { current, previous, either: sql`(${current} or ${previous})` };
}
