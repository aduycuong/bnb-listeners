import { sql } from "drizzle-orm";

import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";

export type ReportWindow = {
  timezone: string;
  /** Start of the first day of the period, in the project's timezone. */
  start: Date;
  /** Start of the period before, `days` days earlier. */
  previousStart: Date;
  /** Days of the period as `YYYY-MM-DD`, oldest first, today last. */
  dates: string[];
};

/**
 * The report period of a project: the last `days` whole days of its timezone, today included,
 * and the same number of days before for comparison.
 */
export async function loadReportWindow(projectId: string, days: number): Promise<ReportWindow> {
  const { rows } = await db.execute<{
    timezone: string;
    start: string;
    previous_start: string;
    dates: string[];
  }>(sql`
    with p as (
      select timezone, date_trunc('day', now() at time zone timezone) as today
      from projects where id = ${projectId}::uuid
    )
    select timezone,
      (today - make_interval(days => ${days - 1})) at time zone timezone as start,
      (today - make_interval(days => ${days * 2 - 1})) at time zone timezone as previous_start,
      array(
        select to_char(d, 'YYYY-MM-DD')
        from generate_series(today - make_interval(days => ${days - 1}), today, interval '1 day') d
      ) as dates
    from p
  `);
  const row = rows[0];
  if (!row) throw new NotFoundError("Project", projectId);

  return {
    timezone: row.timezone,
    start: new Date(row.start),
    previousStart: new Date(row.previous_start),
    dates: row.dates,
  };
}
