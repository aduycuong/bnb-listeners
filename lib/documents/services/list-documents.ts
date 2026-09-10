import { and, desc, eq, inArray } from "drizzle-orm";

import { documents, jobs } from "@/db/schema";
import { db } from "@/lib/db";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import { DOCUMENT_LIST_PAGE_SIZE } from "../document-list-config";
import type { ListDocumentsParams, ListDocumentsResult } from "../types";

export async function listDocuments(
  params: ListDocumentsParams,
  ctx: WorkspaceContext,
): Promise<ListDocumentsResult> {
  const limit = params.limit ?? DOCUMENT_LIST_PAGE_SIZE;
  const offset = params.offset ?? 0;
  const conditions = [eq(documents.workspaceId, ctx.workspaceId)];

  if (params.docType) {
    conditions.push(eq(documents.docType, params.docType));
  }

  if (params.embeddingStatus) {
    conditions.push(eq(documents.embeddingStatus, params.embeddingStatus));
  }

  if (params.jobIds && params.jobIds.length > 0) {
    conditions.push(inArray(documents.jobId, params.jobIds));
  }

  const rows = await db
    .select({
      id: documents.id,
      docType: documents.docType,
      sourceKey: documents.sourceKey,
      sourceName: documents.sourceName,
      sourceId: documents.sourceId,
      title: documents.title,
      rawContent: documents.rawContent,
      embeddingStatus: documents.embeddingStatus,
      qualityScore: documents.qualityScore,
      likeCount: documents.likeCount,
      commentCount: documents.commentCount,
      shareCount: documents.shareCount,
      viewCount: documents.viewCount,
      jobRunId: documents.jobRunId,
      jobId: documents.jobId,
      jobName: jobs.name,
      publishedAt: documents.publishedAt,
      createdAt: documents.createdAt,
      updatedAt: documents.updatedAt,
    })
    .from(documents)
    .innerJoin(jobs, eq(documents.jobId, jobs.id))
    .where(and(...conditions))
    .orderBy(desc(documents.createdAt))
    .limit(limit + 1)
    .offset(offset);

  const pageRows = rows.slice(0, limit);
  const hasMore = rows.length > limit;

  return {
    items: pageRows.map((row) => ({
      ...row,
      publishedAt: row.publishedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    })),
    hasMore,
    offset,
    limit,
  };
}
