import { sql } from "drizzle-orm";

import { db } from "@/lib/db";

import type { MetricsDay } from "../types";
import { periodDateSql, type ReportWindow } from "./resolve-report-window";

/** Relevant mentions of each day of the period by sentiment, from L4 (D28); days without any are zeros. */
export async function loadDailySentiment(
  projectId: string,
  window: ReportWindow,
): Promise<MetricsDay[]> {
  const { rows } = await db.execute<MetricsDay>(sql`
    select to_char(d.date_key, 'YYYY-MM-DD') as date,
      sum(d.positive)::int as positive,
      sum(d.neutral)::int as neutral,
      sum(d.negative)::int as negative,
      sum(d.unknown)::int as unknown
    from project_metrics_daily d
    where d.project_id = ${projectId}::uuid and ${periodDateSql(window).current}
    group by d.date_key
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
