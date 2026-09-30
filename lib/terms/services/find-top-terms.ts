import { sql } from "drizzle-orm";

import { db } from "@/lib/db";
import type { WorkspaceContext } from "@/lib/workspaces/types";
import type { FindTopTermsParams, FindTopTermsResult } from "../types";
import {
  buildTermSearchFtsFilter,
  normalizeTermSearchQuery,
} from "../utils/build-term-search-fts-sql";
import { resolveTopTermsQueryWithLlm } from "../utils/resolve-top-terms-query-with-llm";

type KeywordTopTermRow = {
  id: string;
  name: string;
  description: string | null;
  doc_count: number;
  trend_score: number | null;
};

const DEFAULT_LIMIT = 10;

async function listTopTermsByTrendScore(
  params: {
    search?: string;
    workspaceId: string;
    startDate: string;
    endDate: string;
    limit: number;
  },
): Promise<KeywordTopTermRow[]> {
  const searchFilter = params.search
    ? buildTermSearchFtsFilter(params.search)
    : sql``;

  const result = await db.execute<KeywordTopTermRow>(sql`
    SELECT
      t.id,
      t.name,
      t.description,
      COALESCE(SUM(tdd.doc_count), 0)::int AS doc_count,
      SUM(tdd.trend_score) AS trend_score
    FROM terms t
    LEFT JOIN term_digest_daily tdd
      ON tdd.term_id = t.id
      AND tdd.date_key >= ${params.startDate}::date
      AND tdd.date_key <= ${params.endDate}::date
    WHERE t.workspace_id = ${params.workspaceId}::uuid
      ${searchFilter}
    GROUP BY t.id, t.name, t.description, t.search_tsv
    ORDER BY trend_score DESC NULLS LAST, t.name ASC
    LIMIT ${params.limit}
  `);

  return result.rows;
}

export async function findTopTerms(
  params: FindTopTermsParams,
  ctx: WorkspaceContext,
): Promise<FindTopTermsResult> {
  const period = params.period;
  const normalizedQuery = params.query.trim();
  const includeAllTerms = normalizedQuery.length === 0;

  let searchKeyword: string | undefined;

  if (!includeAllTerms) {
    searchKeyword = normalizeTermSearchQuery(normalizedQuery);
    const llmResolution = await resolveTopTermsQueryWithLlm(normalizedQuery);

    if (llmResolution?.searchKeyword) {
      searchKeyword = normalizeTermSearchQuery(llmResolution.searchKeyword);
    }
  }

  const rows = await listTopTermsByTrendScore({
    search: searchKeyword,
    workspaceId: ctx.workspaceId,
    startDate: period.startDate,
    endDate: period.endDate,
    limit: DEFAULT_LIMIT,
  });

  return {
    searchKeyword,
    period,
    items: rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      docCount: row.doc_count,
      trendScore: row.trend_score,
    })),
  };
}
