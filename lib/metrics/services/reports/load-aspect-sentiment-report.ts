import { sql } from "drizzle-orm";

import { db } from "@/lib/db";

import { netSentimentScore, sharePercent } from "../../formulas";
import type { AspectSentimentReport, ReportContext } from "../../types";
import { periodDateSql } from "../../utils/resolve-report-window";

type AspectRow = {
  id: string;
  key: string;
  name: string;
  mentions: number;
  positive: number;
  neutral: number;
  negative: number;
};

/**
 * Sentiment per project aspect over the period, in aspect order; sums of L4. Effective aspects
 * follow D14: a label's aspect keys when the item is labeled, else Enrich's aspects.
 */
export async function loadAspectSentimentReport(ctx: ReportContext): Promise<AspectSentimentReport> {
  const { rows } = await db.execute<AspectRow>(sql`
    select pa.id, pa.key, pa.name,
      coalesce(sum(d.mentions), 0)::int as mentions,
      coalesce(sum(d.positive), 0)::int as positive,
      coalesce(sum(d.neutral), 0)::int as neutral,
      coalesce(sum(d.negative), 0)::int as negative
    from project_aspects pa
    left join project_aspect_daily d on d.aspect_id = pa.id and ${periodDateSql(ctx.window).current}
    where pa.project_id = ${ctx.projectId}::uuid
    group by pa.id
    order by pa.sort_order, pa.name
  `);

  return rows.map((row) => ({
    id: row.id,
    key: row.key,
    name: row.name,
    mentions: row.mentions,
    positive: Math.round(sharePercent(row.positive, row.mentions) ?? 0),
    negative: Math.round(sharePercent(row.negative, row.mentions) ?? 0),
    nss: netSentimentScore(row),
  }));
}
