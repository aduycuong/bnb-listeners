import { sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  effectiveSentimentJoins,
  effectiveSentimentSql,
} from "@/lib/enrichment/utils/effective-sentiment-sql";
import { ownMentionSql } from "@/lib/mentions/utils/own-mention-sql";

import type { MetricsDay } from "../types";
import type { ReportWindow } from "./load-report-window";

/** Relevant mentions of each day of the period by sentiment; days without mentions are zeros. */
export async function loadDailySentiment(
  projectId: string,
  window: ReportWindow,
): Promise<MetricsDay[]> {
  const { rows } = await db.execute<MetricsDay>(sql`
    select to_char(m.published_at at time zone ${window.timezone}, 'YYYY-MM-DD') as date,
      (count(*) filter (where ${effectiveSentimentSql} = 'positive'))::int as positive,
      (count(*) filter (where ${effectiveSentimentSql} = 'neutral'))::int as neutral,
      (count(*) filter (where ${effectiveSentimentSql} = 'negative'))::int as negative,
      (count(*) filter (where ${effectiveSentimentSql} is null))::int as unknown
    from mentions m
    ${effectiveSentimentJoins}
    where m.project_id = ${projectId}::uuid and m.is_relevant and ${ownMentionSql}
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
