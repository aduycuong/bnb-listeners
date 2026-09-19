import { and, desc, eq, exists, inArray, notExists, sql } from "drizzle-orm";

import { documentTerms, documents, dataSources } from "@/db/schema";
import { assertDataSourceGroupInWorkspace } from "@/lib/data-source-groups/utils/assert-data-source-group-in-workspace";
import { listDataSourceGroupMemberIds } from "@/lib/data-source-groups/utils/list-data-source-group-member-ids";
import { db } from "@/lib/db";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import { DOCUMENT_LIST_PAGE_SIZE } from "../document-list-config";
import type { DocumentTermFilterMode } from "../document-term-filter-config";
import type { ListDocumentsParams, ListDocumentsResult } from "../types";
import { fetchDocumentTermNamesMap } from "../utils/fetch-document-term-names-map";

function intersectIds(
  primaryIds: string[] | undefined,
  secondaryIds: string[],
): string[] {
  if (!primaryIds || primaryIds.length === 0) {
    return secondaryIds;
  }

  const allowed = new Set(secondaryIds);
  return primaryIds.filter((id) => allowed.has(id));
}

function buildTermFilterCondition(
  termFilterMode: DocumentTermFilterMode | undefined,
  termIds: string[] | undefined,
) {
  if (termFilterMode === "none") {
    return notExists(
      db
        .select({ one: sql`1` })
        .from(documentTerms)
        .where(eq(documentTerms.documentId, documents.id)),
    );
  }

  if (termFilterMode === "selected" && termIds && termIds.length > 0) {
    return exists(
      db
        .select({ one: sql`1` })
        .from(documentTerms)
        .where(
          and(
            eq(documentTerms.documentId, documents.id),
            inArray(documentTerms.termId, termIds),
          ),
        ),
    );
  }

  return undefined;
}

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

  let resolvedDataSourceIds = params.dataSourceIds;

  if (params.dataSourceGroupId) {
    await assertDataSourceGroupInWorkspace(
      params.dataSourceGroupId,
      ctx.workspaceId,
    );
    const groupMemberIds = await listDataSourceGroupMemberIds(
      params.dataSourceGroupId,
    );
    resolvedDataSourceIds = intersectIds(resolvedDataSourceIds, groupMemberIds);
  }

  if (resolvedDataSourceIds && resolvedDataSourceIds.length > 0) {
    conditions.push(inArray(documents.dataSourceId, resolvedDataSourceIds));
  } else if (params.dataSourceGroupId) {
    return {
      items: [],
      total: 0,
      hasMore: false,
      offset,
      limit,
    };
  }

  const termFilterMode = params.termFilterMode ?? "all";
  const termFilterCondition = buildTermFilterCondition(
    termFilterMode,
    params.termIds,
  );

  if (termFilterMode === "selected" && (!params.termIds || params.termIds.length === 0)) {
    return {
      items: [],
      total: 0,
      hasMore: false,
      offset,
      limit,
    };
  }

  if (termFilterCondition) {
    conditions.push(termFilterCondition);
  }

  const whereClause = and(...conditions);

  const [countRows, rows] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(documents)
      .innerJoin(dataSources, eq(documents.dataSourceId, dataSources.id))
      .where(whereClause),
    db
      .select({
        id: documents.id,
        docType: documents.docType,
        sourceOriginKey: documents.sourceOriginKey,
        sourceOriginName: documents.sourceOriginName,
        sourceItemId: documents.sourceItemId,
        title: documents.title,
        rawContent: documents.rawContent,
        authorName: documents.authorName,
        embeddingStatus: documents.embeddingStatus,
        qualityScore: documents.qualityScore,
        likeCount: documents.likeCount,
        commentCount: documents.commentCount,
        shareCount: documents.shareCount,
        viewCount: documents.viewCount,
        sourceRunId: documents.sourceRunId,
        dataSourceId: documents.dataSourceId,
        dataSourceName: dataSources.name,
        publishedAt: documents.publishedAt,
        createdAt: documents.createdAt,
        updatedAt: documents.updatedAt,
      })
      .from(documents)
      .innerJoin(dataSources, eq(documents.dataSourceId, dataSources.id))
      .where(whereClause)
      .orderBy(desc(documents.createdAt))
      .limit(limit + 1)
      .offset(offset),
  ]);

  const pageRows = rows.slice(0, limit);
  const hasMore = rows.length > limit;
  const termsByDocumentId = await fetchDocumentTermNamesMap(
    pageRows.map((row) => row.id),
  );

  return {
    items: pageRows.map((row) => ({
      ...row,
      publishedAt: row.publishedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      terms: termsByDocumentId.get(row.id) ?? [],
    })),
    total: countRows[0]?.count ?? 0,
    hasMore,
    offset,
    limit,
  };
}
