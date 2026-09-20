import { and, desc, eq, inArray, isNull, notExists, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { documentTerms, documents, dataSources } from "@/db/schema";
import { assertDataSourceGroupInWorkspace } from "@/lib/data-source-groups/utils/assert-data-source-group-in-workspace";
import { listDataSourceGroupMemberIds } from "@/lib/data-source-groups/utils/list-data-source-group-member-ids";
import { db } from "@/lib/db";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import { DOCUMENT_LIST_PAGE_SIZE } from "../document-list-config";
import type { DocumentTermFilterMode } from "../document-term-filter-config";
import type { ListDocumentsParams, ListDocumentsResult } from "../types";
import {
  buildListDocumentFilterConditions,
  buildListDocumentTermFilterCondition,
  documentListSortTimestamp,
} from "../utils/build-list-document-filter-conditions";
import { fetchDocumentTermNamesMap } from "../utils/fetch-document-term-names-map";
import { orderDocumentListPageRows } from "../utils/order-document-list-page-rows";

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

const documentListSelect = {
  id: documents.id,
  parentDocumentId: documents.parentDocumentId,
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
};

export async function listDocuments(
  params: ListDocumentsParams,
  ctx: WorkspaceContext,
): Promise<ListDocumentsResult> {
  const limit = params.limit ?? DOCUMENT_LIST_PAGE_SIZE;
  const offset = params.offset ?? 0;
  const parentDocuments = alias(documents, "parent_documents");

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

  if (params.dataSourceGroupId && (!resolvedDataSourceIds || resolvedDataSourceIds.length === 0)) {
    return {
      items: [],
      total: 0,
      hasMore: false,
      offset,
      limit,
      rootCount: 0,
    };
  }

  const termFilterMode = params.termFilterMode ?? "all";
  if (termFilterMode === "selected" && (!params.termIds || params.termIds.length === 0)) {
    return {
      items: [],
      total: 0,
      hasMore: false,
      offset,
      limit,
      rootCount: 0,
    };
  }

  const filterParams = {
    workspaceId: ctx.workspaceId,
    docType: params.docType,
    embeddingStatus: params.embeddingStatus,
    dataSourceIds: resolvedDataSourceIds,
  };

  const documentFilterConditions = buildListDocumentFilterConditions(
    documents,
    filterParams,
  );
  const termFilterCondition = buildListDocumentTermFilterCondition(
    documents.id,
    termFilterMode,
    params.termIds,
  );
  const whereClause = termFilterCondition
    ? and(...documentFilterConditions, termFilterCondition)
    : and(...documentFilterConditions);

  const parentFilterConditions = buildListDocumentFilterConditions(
    parentDocuments,
    filterParams,
  );
  const parentTermFilterCondition = buildListDocumentTermFilterCondition(
    parentDocuments.id,
    termFilterMode as DocumentTermFilterMode,
    params.termIds,
  );
  const parentMatchConditions = parentTermFilterCondition
    ? [...parentFilterConditions, parentTermFilterCondition]
    : parentFilterConditions;
  const displayRootCondition = or(
    isNull(documents.parentDocumentId),
    notExists(
      db
        .select({ one: sql`1` })
        .from(parentDocuments)
        .where(
          and(
            eq(parentDocuments.id, documents.parentDocumentId),
            ...parentMatchConditions,
          ),
        ),
    ),
  );
  const rootWhereClause = and(whereClause, displayRootCondition);

  const [countRows, rootRows] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(documents)
      .innerJoin(dataSources, eq(documents.dataSourceId, dataSources.id))
      .where(whereClause),
    db
      .select({ id: documents.id })
      .from(documents)
      .innerJoin(dataSources, eq(documents.dataSourceId, dataSources.id))
      .where(rootWhereClause)
      .orderBy(desc(documentListSortTimestamp(documents)))
      .limit(limit + 1)
      .offset(offset),
  ]);

  const pageRootIds = rootRows.slice(0, limit).map((row) => row.id);
  const hasMore = rootRows.length > limit;

  if (pageRootIds.length === 0) {
    return {
      items: [],
      total: countRows[0]?.count ?? 0,
      hasMore: false,
      offset,
      limit,
      rootCount: 0,
    };
  }

  const groupCondition = or(
    inArray(documents.id, pageRootIds),
    inArray(documents.parentDocumentId, pageRootIds),
  );

  const rows = await db
    .select(documentListSelect)
    .from(documents)
    .innerJoin(dataSources, eq(documents.dataSourceId, dataSources.id))
    .where(and(whereClause, groupCondition))
    .orderBy(
      desc(documentListSortTimestamp(documents)),
      desc(documents.createdAt),
    );

  const pageRows = orderDocumentListPageRows(rows, pageRootIds);
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
    rootCount: pageRootIds.length,
  };
}
