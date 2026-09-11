import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";

import { documentTerms, documents, jobs, terms } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import { TERM_DETAIL_DOCUMENTS_PAGE_SIZE } from "../term-detail-chart-config";
import type {
  ListTermDocumentsParams,
  ListTermDocumentsResult,
} from "../types";

function buildSearchCondition(search?: string) {
  const term = search?.trim();
  if (!term) {
    return undefined;
  }

  const pattern = `%${term}%`;

  return or(
    ilike(documents.title, pattern),
    ilike(documents.sourceName, pattern),
    ilike(documents.sourceId, pattern),
    ilike(documents.rawContent, pattern),
  );
}

async function assertTermInWorkspace(termId: string, workspaceId: string) {
  const [term] = await db
    .select({ id: terms.id })
    .from(terms)
    .where(
      and(eq(terms.id, termId), eq(terms.workspaceId, workspaceId)),
    )
    .limit(1);

  if (!term) {
    throw new NotFoundError("term", termId);
  }
}

export async function listTermDocuments(
  params: ListTermDocumentsParams,
  ctx: WorkspaceContext,
): Promise<ListTermDocumentsResult> {
  await assertTermInWorkspace(params.termId, ctx.workspaceId);

  const limit = params.limit ?? TERM_DETAIL_DOCUMENTS_PAGE_SIZE;
  const offset = params.offset ?? 0;
  const searchCondition = buildSearchCondition(params.search);

  const conditions = [
    eq(documentTerms.termId, params.termId),
    eq(documents.workspaceId, ctx.workspaceId),
  ];

  if (params.jobIds && params.jobIds.length > 0) {
    conditions.push(inArray(documents.jobId, params.jobIds));
  }

  if (searchCondition) {
    conditions.push(searchCondition);
  }

  const rows = await db
    .select({
      id: documents.id,
      title: documents.title,
      sourceName: documents.sourceName,
      sourceId: documents.sourceId,
      jobName: jobs.name,
      publishedAt: documents.publishedAt,
      confidence: documentTerms.confidence,
      qualityScore: documents.qualityScore,
    })
    .from(documentTerms)
    .innerJoin(documents, eq(documentTerms.documentId, documents.id))
    .innerJoin(jobs, eq(documents.jobId, jobs.id))
    .where(and(...conditions))
    .orderBy(
      sql`${documents.publishedAt} DESC NULLS LAST`,
      desc(documents.createdAt),
    )
    .limit(limit + 1)
    .offset(offset);

  const pageRows = rows.slice(0, limit);
  const hasMore = rows.length > limit;

  return {
    items: pageRows.map((row) => ({
      id: row.id,
      title: row.title,
      sourceName: row.sourceName,
      sourceId: row.sourceId,
      jobName: row.jobName,
      publishedAt: row.publishedAt?.toISOString() ?? null,
      confidence: row.confidence,
      qualityScore: row.qualityScore,
    })),
    hasMore,
    offset,
    limit,
  };
}
