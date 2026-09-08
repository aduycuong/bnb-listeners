import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";

import { documentTopics, documents, jobs, topics } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import { TOPIC_DETAIL_DOCUMENTS_PAGE_SIZE } from "../topic-detail-chart-config";
import type {
  ListTopicDocumentsParams,
  ListTopicDocumentsResult,
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

async function assertTopicInWorkspace(topicId: string, workspaceId: string) {
  const [topic] = await db
    .select({ id: topics.id })
    .from(topics)
    .where(
      and(eq(topics.id, topicId), eq(topics.workspaceId, workspaceId)),
    )
    .limit(1);

  if (!topic) {
    throw new NotFoundError("topic", topicId);
  }
}

export async function listTopicDocuments(
  params: ListTopicDocumentsParams,
  ctx: WorkspaceContext,
): Promise<ListTopicDocumentsResult> {
  await assertTopicInWorkspace(params.topicId, ctx.workspaceId);

  const limit = params.limit ?? TOPIC_DETAIL_DOCUMENTS_PAGE_SIZE;
  const offset = params.offset ?? 0;
  const searchCondition = buildSearchCondition(params.search);

  const conditions = [
    eq(documentTopics.topicId, params.topicId),
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
      confidence: documentTopics.confidence,
      qualityScore: documents.qualityScore,
    })
    .from(documentTopics)
    .innerJoin(documents, eq(documentTopics.documentId, documents.id))
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
