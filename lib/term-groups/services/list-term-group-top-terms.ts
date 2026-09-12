import { sql } from "drizzle-orm";

import { db } from "@/lib/db";
import type { WorkspaceContext } from "@/lib/workspaces/types";
import { resolveTermDetailChartPeriod } from "@/lib/terms/utils/resolve-term-detail-chart-period";

import { TERM_GROUP_TOP_TERMS_LIMIT } from "../term-group-config";
import type {
  ListTermGroupTopTermsParams,
  ListTermGroupTopTermsResult,
} from "../types";
import { assertTermGroupInWorkspace } from "../utils/assert-term-group-in-workspace";

type TopTermRow = {
  id: string;
  name: string;
  description: string | null;
  doc_count: number;
  avg_quality_score: number | null;
  trend_score: number | null;
  is_stale: boolean;
};

function getOrderClause(
  sort: ListTermGroupTopTermsParams["sort"],
) {
  switch (sort) {
    case "count":
      return sql`doc_count DESC, t.name ASC`;
    case "quality":
      return sql`avg_quality_score DESC NULLS LAST, t.name ASC`;
    case "trend":
      return sql`trend_score DESC NULLS LAST, t.name ASC`;
    default: {
      const exhaustive: never = sort;
      throw new Error(`Unsupported top terms sort: ${exhaustive}`);
    }
  }
}

export async function listTermGroupTopTerms(
  params: ListTermGroupTopTermsParams,
  ctx: WorkspaceContext,
): Promise<ListTermGroupTopTermsResult> {
  await assertTermGroupInWorkspace(params.id, ctx.workspaceId);

  const period = resolveTermDetailChartPeriod({
    preset: params.period,
    startDate: params.startDate,
    endDate: params.endDate,
  });
  const limit = params.limit ?? TERM_GROUP_TOP_TERMS_LIMIT;
  const orderClause = getOrderClause(params.sort);

  const result = await db.execute<TopTermRow>(sql`
    SELECT
      t.id,
      t.name,
      t.description,
      COALESCE(SUM(tdd.doc_count), 0)::int AS doc_count,
      AVG(tdd.avg_quality_score) AS avg_quality_score,
      SUM(tdd.trend_score) AS trend_score,
      COALESCE(BOOL_OR(tdd.is_stale), false) AS is_stale
    FROM term_group_members tgm
    INNER JOIN terms t ON t.id = tgm.term_id
    LEFT JOIN term_digest_daily tdd
      ON tdd.term_id = t.id
      AND tdd.date_key >= ${period.startDate}::date
      AND tdd.date_key <= ${period.endDate}::date
    WHERE tgm.term_group_id = ${params.id}::uuid
      AND t.workspace_id = ${ctx.workspaceId}::uuid
    GROUP BY t.id, t.name, t.description
    ORDER BY ${orderClause}
    LIMIT ${limit}
  `);

  return {
    items: result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      digest: {
        docCount: row.doc_count,
        avgQualityScore: row.avg_quality_score,
        trendScore: row.trend_score,
        isStale: row.is_stale,
      },
    })),
    period: {
      preset: period.preset,
      startDate: period.startDate,
      endDate: period.endDate,
    },
    sort: params.sort,
  };
}
