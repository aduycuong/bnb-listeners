import { sql } from "drizzle-orm";

import { db } from "@/lib/db";

import { netSentimentScore, sharePercent } from "../../formulas";
import type { ReportContext, SentimentBreakdownReport } from "../../types";
import { periodDateSql } from "../../utils/resolve-report-window";

/** Mentions of the period by sentiment, with their NSS and negative share; sums of L4. */
export async function loadSentimentBreakdownReport(
  ctx: ReportContext,
): Promise<SentimentBreakdownReport> {
  const { rows } = await db.execute<{
    positive: number;
    neutral: number;
    negative: number;
    unknown: number;
  }>(sql`
    select coalesce(sum(d.positive), 0)::int as positive,
      coalesce(sum(d.neutral), 0)::int as neutral,
      coalesce(sum(d.negative), 0)::int as negative,
      coalesce(sum(d.unknown), 0)::int as unknown
    from project_metrics_daily d
    where d.project_id = ${ctx.projectId}::uuid and ${periodDateSql(ctx.window).current}
  `);
  const counts = rows[0] ?? { positive: 0, neutral: 0, negative: 0, unknown: 0 };

  return {
    ...counts,
    nss: netSentimentScore(counts),
    negativeShare: sharePercent(counts.negative, counts.positive + counts.neutral + counts.negative),
  };
}
