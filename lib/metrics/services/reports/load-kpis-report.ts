import { sql } from "drizzle-orm";

import { db } from "@/lib/db";

import { netSentimentScore, sharePercent } from "../../formulas";
import type { KpisReport, ReportContext } from "../../types";
import { periodDateSql, periodSql } from "../../utils/resolve-report-window";

type Period = "current" | "previous";

type CountRow = {
  period: Period;
  mentions: number;
  engagement: number;
  positive: number;
  neutral: number;
  negative: number;
};

/**
 * KPI tiles of the period against the period compared (D28): mentions, engagement, distinct
 * authors, NSS and negative share. Counts are sums of L4; distinct authors read L3 as they do
 * not add up over days.
 */
export async function loadKpisReport(ctx: ReportContext): Promise<KpisReport> {
  const days = periodDateSql(ctx.window);
  const period = periodSql(ctx.window);

  const [{ rows: countRows }, { rows: authorRows }] = await Promise.all([
    db.execute<CountRow>(sql`
      select case when ${days.current} then 'current' else 'previous' end as period,
        sum(d.mentions)::int as mentions,
        sum(d.engagement)::int as engagement,
        sum(d.positive)::int as positive,
        sum(d.neutral)::int as neutral,
        sum(d.negative)::int as negative
      from project_metrics_daily d
      where d.project_id = ${ctx.projectId}::uuid and ${days.either}
      group by 1
    `),
    db.execute<{ period: Period; authors: number }>(sql`
      select case when ${period.current} then 'current' else 'previous' end as period,
        count(distinct m.author_id)::int as authors
      from mentions m
      where m.project_id = ${ctx.projectId}::uuid and m.is_relevant and ${period.either}
      group by 1
    `),
  ]);

  const counts = (key: Period) =>
    countRows.find((row) => row.period === key) ?? {
      mentions: 0,
      engagement: 0,
      positive: 0,
      neutral: 0,
      negative: 0,
    };
  const current = counts("current");
  const previous = counts("previous");
  const pick = <T,>(read: (row: Omit<CountRow, "period">) => T) => ({
    current: read(current),
    previous: read(previous),
  });
  const authors = (key: Period) => authorRows.find((row) => row.period === key)?.authors ?? 0;

  return {
    mentions: pick((row) => row.mentions),
    engagement: pick((row) => row.engagement),
    uniqueAuthors: { current: authors("current"), previous: authors("previous") },
    nss: pick((row) => netSentimentScore(row)),
    negativeShare: pick((row) => sharePercent(row.negative, row.positive + row.neutral + row.negative)),
  };
}
