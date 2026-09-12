import { sql, type SQL } from "drizzle-orm";

import { normalizeQueryForFts } from "@/lib/retrieval/utils/normalize-query-for-fts";

import type { TermCardSort } from "../term-card-config";

export function normalizeTermSearchQuery(search?: string): string {
  if (!search?.trim()) {
    return "";
  }

  return normalizeQueryForFts(search);
}

/** WHERE fragment: `AND t.search_tsv @@ websearch_to_tsquery(...)` */
export function buildTermSearchFtsFilter(search?: string): SQL {
  const normalized = normalizeTermSearchQuery(search);
  if (!normalized) {
    return sql``;
  }

  return sql`AND t.search_tsv @@ websearch_to_tsquery('simple', ${normalized})`;
}

function getTermCardSortOrderClause(sort: TermCardSort): SQL {
  switch (sort) {
    case "count":
      return sql`doc_count DESC, t.name ASC`;
    case "quality":
      return sql`avg_quality_score DESC NULLS LAST, t.name ASC`;
    case "created_at":
      return sql`t.created_at DESC, t.name ASC`;
    case "trend":
    default:
      return sql`trend_score DESC NULLS LAST, t.name ASC`;
  }
}

/** Relevance-first when searching; otherwise the selected card sort. */
export function buildTermSearchOrderClause(
  search: string | undefined,
  sort: TermCardSort,
): SQL {
  const normalized = normalizeTermSearchQuery(search);
  if (normalized) {
    return sql`ts_rank(t.search_tsv, websearch_to_tsquery('simple', ${normalized})) DESC, t.name ASC`;
  }

  return getTermCardSortOrderClause(sort);
}
