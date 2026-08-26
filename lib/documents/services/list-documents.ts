import { and, desc, eq } from "drizzle-orm";

import { documents, jobRuns, jobs } from "@/db/schema";
import { db } from "@/lib/db";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import type { ListDocumentsParams, ListDocumentsResult } from "../types";

export async function listDocuments(
  params: ListDocumentsParams,
  ctx: WorkspaceContext,
): Promise<ListDocumentsResult> {
  const conditions = [eq(documents.workspaceId, ctx.workspaceId)];

  if (params.docType) {
    conditions.push(eq(documents.docType, params.docType));
  }

  if (params.embeddingStatus) {
    conditions.push(eq(documents.embeddingStatus, params.embeddingStatus));
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
      isDuplicate: documents.isDuplicate,
      jobRunId: documents.jobRunId,
      jobName: jobs.name,
      publishedAt: documents.publishedAt,
      createdAt: documents.createdAt,
      updatedAt: documents.updatedAt,
    })
    .from(documents)
    .leftJoin(jobRuns, eq(documents.jobRunId, jobRuns.id))
    .leftJoin(jobs, eq(jobRuns.jobId, jobs.id))
    .where(and(...conditions))
    .orderBy(desc(documents.createdAt));

  return {
    items: rows.map((row) => ({
      ...row,
      publishedAt: row.publishedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    })),
  };
}
