import { sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  effectiveSentimentJoins,
  effectiveSentimentSql,
} from "@/lib/enrichment/utils/effective-sentiment-sql";

import { METRICS_CONFIG } from "../../config";
import type { KeywordsReport, ReportContext, ReportParamsMap } from "../../types";
import { periodSql } from "../../utils/resolve-report-window";

type KeywordRow = { keyword: string; text: string; mentions: number; negative: number };

/** Keywords of the cloud (D16): relevant mentions of the period per keyword, from `mention_terms`. */
export async function loadKeywordsReport(
  ctx: ReportContext,
  params: ReportParamsMap["keywords"],
): Promise<KeywordsReport> {
  const { rows } = await db.execute<KeywordRow>(sql`
    select mt.term as keyword, mode() within group (order by mt.text) as text,
      count(*)::int as mentions,
      (count(*) filter (where ${effectiveSentimentSql} = 'negative'))::int as negative
    from mention_terms mt
    join mentions m on m.id = mt.mention_id
    ${effectiveSentimentJoins}
    where m.project_id = ${ctx.projectId}::uuid and m.is_relevant
      and mt.kind = 'keyword' and ${periodSql(ctx.window).current}
    group by mt.term
    order by mentions desc, mt.term
    limit ${params.limit ?? METRICS_CONFIG.topKeywords}
  `);

  return rows.map((row) => ({
    keyword: row.keyword,
    text: row.text,
    mentions: row.mentions,
    negative: row.mentions ? Math.round((row.negative / row.mentions) * 100) : 0,
  }));
}
