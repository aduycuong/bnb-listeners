import { sql } from "drizzle-orm";

import { db } from "@/lib/db";

import type { MetricsDay } from "../types";
import type { ReportWindow } from "./load-report-window";

/** Relevant mentions of each day of the period by sentiment; days without mentions are zeros. */
export async function loadDailySentiment(
  projectId: string,
  window: ReportWindow,
): Promise<MetricsDay[]> {
  const { rows } = await db.execute<MetricsDay>(sql`
    select to_char(m.published_at at time zone ${window.timezone}, 'YYYY-MM-DD') as date,
      (count(*) filter (where m.sentiment = 'positive'))::int as positive,
      (count(*) filter (where m.sentiment = 'neutral'))::int as neutral,
      (count(*) filter (where m.sentiment = 'negative'))::int as negative,
      (count(*) filter (where m.sentiment is null))::int as unknown
    from mentions m
    where m.project_id = ${projectId}::uuid and m.is_relevant
      and m.published_at >= ${window.start.toISOString()}::timestamptz
    group by 1
  `);
  const byDate = new Map(rows.map((row) => [row.date, row]));

  return window.dates.map((date) => {
    const row = byDate.get(date);
    return {
      date,
      positive: row?.positive ?? 0,
      neutral: row?.neutral ?? 0,
      negative: row?.negative ?? 0,
      unknown: row?.unknown ?? 0,
    };
  });
}
