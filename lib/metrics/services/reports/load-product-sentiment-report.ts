import { sql } from "drizzle-orm";

import { db } from "@/lib/db";

import { netSentimentScore } from "../../formulas";
import type { ProductSentimentReport, ReportContext } from "../../types";
import { periodSql } from "../../utils/resolve-report-window";

type ProductRow = {
  id: string;
  name: string;
  mentions: number;
  positive: number;
  neutral: number;
  negative: number;
};

/**
 * NSS of each project of the developer (`product` entities) over the period, most mentioned
 * first, from the sentiment Enrich gave each entity (`mention_entities`).
 */
export async function loadProductSentimentReport(ctx: ReportContext): Promise<ProductSentimentReport> {
  const { rows } = await db.execute<ProductRow>(sql`
    select pe.id, pe.name,
      count(m.id)::int as mentions,
      (count(m.id) filter (where me.sentiment = 'positive'))::int as positive,
      (count(m.id) filter (where me.sentiment = 'neutral'))::int as neutral,
      (count(m.id) filter (where me.sentiment = 'negative'))::int as negative
    from project_entities pe
    left join mention_entities me on me.entity_id = pe.id
    left join mentions m on m.id = me.mention_id and m.is_relevant
      and ${periodSql(ctx.window).current}
    where pe.project_id = ${ctx.projectId}::uuid and pe.role = 'product'
    group by pe.id
    order by mentions desc, pe.sort_order, pe.name
  `);

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    mentions: row.mentions,
    nss: row.mentions ? netSentimentScore(row) : null,
  }));
}
