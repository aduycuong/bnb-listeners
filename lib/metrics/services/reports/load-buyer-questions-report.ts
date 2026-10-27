import { sql } from "drizzle-orm";

import { db } from "@/lib/db";

import { METRICS_CONFIG } from "../../config";
import type { BuyerQuestionsReport, ReportContext, ReportParamsMap } from "../../types";
import { periodSql } from "../../utils/resolve-report-window";

/**
 * Grouped buyer questions of the period, most asked first (`limit`, default
 * `topBuyerQuestions`), and the `buyer_question` extractions of the period and the one before.
 */
export async function loadBuyerQuestionsReport(
  ctx: ReportContext,
  params: ReportParamsMap["buyer-questions"],
): Promise<BuyerQuestionsReport> {
  const period = periodSql(ctx.window);
  const [{ rows: items }, { rows: totals }] = await Promise.all([
    db.execute<BuyerQuestionsReport["items"][number]>(sql`
      select t.id, t.name, count(*)::int as mentions
      from topics t
      join mention_topics mt on mt.topic_id = t.id and mt.kind = 'buyer_question'
      join mentions m on m.id = mt.mention_id and m.is_relevant
      where t.project_id = ${ctx.projectId}::uuid
        and t.kind = 'buyer_question' and t.status = 'active'
        and ${period.current}
      group by t.id
      order by mentions desc, t.name
      limit ${params.limit ?? METRICS_CONFIG.topBuyerQuestions}
    `),
    db.execute<{ current_count: number; previous_count: number }>(sql`
      select
        count(*) filter (where ${period.current})::int as current_count,
        count(*) filter (where ${period.previous})::int as previous_count
      from mention_extractions x
      join mentions m on m.id = x.mention_id
      where m.project_id = ${ctx.projectId}::uuid and m.is_relevant
        and x.schema_key = 'buyer_question'
        and ${period.either}
    `),
  ]);

  return {
    total: { current: totals[0]?.current_count ?? 0, previous: totals[0]?.previous_count ?? 0 },
    items,
  };
}
