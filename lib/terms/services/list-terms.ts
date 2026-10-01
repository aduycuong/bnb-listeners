import { and, desc, eq, sql } from "drizzle-orm";

import { projects, terms } from "@/db/schema";
import { db } from "@/lib/db";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import type { ListTermsParams, ListTermsResult } from "../types";
import { normalizeTermSearchQuery } from "../utils/build-term-search-fts-sql";
import { toTermListItem } from "../utils/to-term-list-item";

export async function listTerms(
  params: ListTermsParams,
  ctx: WorkspaceContext,
): Promise<ListTermsResult> {
  const normalizedSearch = normalizeTermSearchQuery(params.search);
  const conditions = [eq(projects.workspaceId, ctx.workspaceId)];

  if (ctx.projectId) {
    conditions.push(eq(terms.projectId, ctx.projectId));
  }

  if (normalizedSearch) {
    conditions.push(
      sql`${terms.searchTsv} @@ websearch_to_tsquery('simple', ${normalizedSearch})`,
    );
  }

  const rows = await db
    .select({ term: terms })
    .from(terms)
    .innerJoin(projects, eq(terms.projectId, projects.id))
    .where(and(...conditions))
    .orderBy(
      normalizedSearch
        ? sql`ts_rank(${terms.searchTsv}, websearch_to_tsquery('simple', ${normalizedSearch})) DESC`
        : desc(terms.createdAt),
    );

  return {
    items: rows.map((row) => toTermListItem(row.term)),
  };
}
