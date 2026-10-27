import { sql } from "drizzle-orm";

import { db } from "@/lib/db";

import type { PostingHeatmapReport, ReportContext } from "../../types";
import { periodSql } from "../../utils/resolve-report-window";

/** Mentions of the period per weekday (0 = Monday) and hour of the project's timezone; reads L3. */
export async function loadPostingHeatmapReport(ctx: ReportContext): Promise<PostingHeatmapReport> {
  const tz = ctx.window.timezone;
  const { rows } = await db.execute<PostingHeatmapReport[number]>(sql`
    select (extract(isodow from m.published_at at time zone ${tz}) - 1)::int as weekday,
      extract(hour from m.published_at at time zone ${tz})::int as hour,
      count(*)::int as mentions
    from mentions m
    where m.project_id = ${ctx.projectId}::uuid and m.is_relevant
      and ${periodSql(ctx.window).current}
    group by 1, 2
  `);
  return rows;
}
