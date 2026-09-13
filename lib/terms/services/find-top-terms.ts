import { sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { TERM_GROUP_TOP_TERMS_LIMIT } from "@/lib/term-groups/term-group-config";
import { listTermGroupTopTerms } from "@/lib/term-groups/services/list-term-group-top-terms";
import { listTermGroups } from "@/lib/term-groups/services/list-term-groups";
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
};

const DEFAULT_LIMIT = TERM_GROUP_TOP_TERMS_LIMIT;

async function listTopTermsByDocCount(
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
      COALESCE(SUM(tdd.doc_count), 0)::int AS doc_count
    FROM terms t
    LEFT JOIN term_digest_daily tdd
      ON tdd.term_id = t.id
      AND tdd.date_key >= ${params.startDate}::date
      AND tdd.date_key <= ${params.endDate}::date
    WHERE t.workspace_id = ${params.workspaceId}::uuid
      ${searchFilter}
    GROUP BY t.id, t.name, t.description, t.search_tsv
    ORDER BY doc_count DESC, t.name ASC
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

  let mode: FindTopTermsResult["resolvedMode"] = "keyword_search";
  let termGroup: FindTopTermsResult["termGroup"];
  let searchKeyword: string | undefined;

  if (!includeAllTerms) {
    const { items: groups } = await listTermGroups({}, ctx);
    const llmResolution = await resolveTopTermsQueryWithLlm(normalizedQuery, groups);

    searchKeyword = normalizeTermSearchQuery(normalizedQuery);

    if (llmResolution?.mode === "term_group" && llmResolution.termGroupId) {
      const matchedGroup = groups.find((group) => group.id === llmResolution.termGroupId);
      if (matchedGroup) {
        mode = "term_group";
        termGroup = { id: matchedGroup.id, name: matchedGroup.name };
        searchKeyword = undefined;
      }
    }

    if (mode === "keyword_search" && llmResolution?.searchKeyword) {
      searchKeyword = normalizeTermSearchQuery(llmResolution.searchKeyword);
    }
  }

  if (mode === "keyword_search") {
    const rows = await listTopTermsByDocCount({
      search: searchKeyword,
      workspaceId: ctx.workspaceId,
      startDate: period.startDate,
      endDate: period.endDate,
      limit: DEFAULT_LIMIT,
    });

    return {
      resolvedMode: mode,
      searchKeyword,
      period,
      items: rows.map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        docCount: row.doc_count,
      })),
    };
  }

  const groupResult = await listTermGroupTopTerms(
    {
      id: termGroup!.id,
      period: period.preset,
      startDate: period.startDate,
      endDate: period.endDate,
      sort: "count",
      limit: DEFAULT_LIMIT,
    },
    ctx,
  );

  return {
    resolvedMode: mode,
    termGroup,
    period,
    items: groupResult.items.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      docCount: item.digest.docCount,
    })),
  };
}
