import { and, desc, eq, ilike, inArray, isNull, notExists, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

import { dataSources, documentTerms, documents, terms } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { documentListSortTimestamp } from "@/lib/documents/utils/build-list-document-filter-conditions";
import { fetchDocumentTermNamesMap } from "@/lib/documents/utils/fetch-document-term-names-map";
import { orderDocumentListPageRows } from "@/lib/documents/utils/order-document-list-page-rows";
import { db } from "@/lib/db";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import { TERM_DETAIL_DOCUMENTS_PAGE_SIZE } from "../term-detail-chart-config";
import type {
  ListTermDocumentsParams,
  ListTermDocumentsResult,
} from "../types";

type TermDocumentSearchTable = {
  title: AnyPgColumn;
  authorName: AnyPgColumn;
  sourceOriginName: AnyPgColumn;
  sourceItemId: AnyPgColumn;
  rawContent: AnyPgColumn;
};

function buildSearchCondition(
  doc: TermDocumentSearchTable,
  search?: string,
) {
  const term = search?.trim();
  if (!term) {
    return undefined;
  }

  const pattern = `%${term}%`;

  return or(
    ilike(doc.title, pattern),
    ilike(doc.authorName, pattern),
    ilike(doc.sourceOriginName, pattern),
    ilike(doc.sourceItemId, pattern),
    ilike(doc.rawContent, pattern),
  );
}

async function assertTermInWorkspace(termId: string, workspaceId: string) {
  const [term] = await db
    .select({ id: terms.id })
    .from(terms)
    .where(and(eq(terms.id, termId), eq(terms.workspaceId, workspaceId)))
    .limit(1);

  if (!term) {
    throw new NotFoundError("term", termId);
  }
}

function buildTermDocumentConditions(
  termId: string,
  workspaceId: string,
  dataSourceIds: string[] | undefined,
  search: string | undefined,
) {
  const searchCondition = buildSearchCondition(documents, search);
  const conditions = [
    eq(documentTerms.termId, termId),
    eq(documents.workspaceId, workspaceId),
  ];

  if (dataSourceIds && dataSourceIds.length > 0) {
    conditions.push(inArray(documents.dataSourceId, dataSourceIds));
  }

  if (searchCondition) {
    conditions.push(searchCondition);
  }

  return and(...conditions);
}

type TermDocumentParentTable = TermDocumentSearchTable & {
  id: AnyPgColumn;
  workspaceId: AnyPgColumn;
  dataSourceId: AnyPgColumn;
};

type TermDocumentParentTermsTable = {
  documentId: AnyPgColumn;
  termId: AnyPgColumn;
};

function buildParentTermDocumentMatchConditions(
  termId: string,
  parentDocuments: TermDocumentParentTable,
  parentDocumentTerms: TermDocumentParentTermsTable,
  workspaceId: string,
  dataSourceIds: string[] | undefined,
  search: string | undefined,
) {
  const searchCondition = buildSearchCondition(parentDocuments, search);
  const conditions = [
    eq(parentDocumentTerms.documentId, parentDocuments.id),
    eq(parentDocumentTerms.termId, termId),
    eq(parentDocuments.workspaceId, workspaceId),
  ];

  if (dataSourceIds && dataSourceIds.length > 0) {
    conditions.push(inArray(parentDocuments.dataSourceId, dataSourceIds));
  }

  if (searchCondition) {
    conditions.push(searchCondition);
  }

  return and(...conditions);
}

export async function listTermDocuments(
  params: ListTermDocumentsParams,
  ctx: WorkspaceContext,
): Promise<ListTermDocumentsResult> {
  await assertTermInWorkspace(params.termId, ctx.workspaceId);

  const limit = params.limit ?? TERM_DETAIL_DOCUMENTS_PAGE_SIZE;
  const offset = params.offset ?? 0;
  const parentDocuments = alias(documents, "parent_documents");
  const parentDocumentTerms = alias(documentTerms, "parent_document_terms");

  const whereClause = buildTermDocumentConditions(
    params.termId,
    ctx.workspaceId,
    params.dataSourceIds,
    params.search,
  );

  const parentMatchConditions = buildParentTermDocumentMatchConditions(
    params.termId,
    parentDocuments,
    parentDocumentTerms,
    ctx.workspaceId,
    params.dataSourceIds,
    params.search,
  );

  const displayRootCondition = or(
    isNull(documents.parentDocumentId),
    notExists(
      db
        .select({ one: sql`1` })
        .from(parentDocuments)
        .innerJoin(
          parentDocumentTerms,
          eq(parentDocumentTerms.documentId, parentDocuments.id),
        )
        .where(
          and(
            eq(parentDocuments.id, documents.parentDocumentId),
            parentMatchConditions,
          ),
        ),
    ),
  );
  const rootWhereClause = and(whereClause, displayRootCondition);

  const [rootRows] = await Promise.all([
    db
      .select({ id: documents.id })
      .from(documentTerms)
      .innerJoin(documents, eq(documentTerms.documentId, documents.id))
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
    .select({
      id: documents.id,
      parentDocumentId: documents.parentDocumentId,
      docType: documents.docType,
      title: documents.title,
      rawContent: documents.rawContent,
      sourceOriginName: documents.sourceOriginName,
      sourceItemId: documents.sourceItemId,
      authorName: documents.authorName,
      embeddingStatus: documents.embeddingStatus,
      dataSourceName: dataSources.name,
      publishedAt: documents.publishedAt,
      createdAt: documents.createdAt,
      confidence: documentTerms.confidence,
      qualityScore: documents.qualityScore,
    })
    .from(documentTerms)
    .innerJoin(documents, eq(documentTerms.documentId, documents.id))
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
      id: row.id,
      parentDocumentId: row.parentDocumentId,
      docType: row.docType,
      title: row.title,
      rawContent: row.rawContent,
      sourceOriginName: row.sourceOriginName,
      sourceItemId: row.sourceItemId,
      authorName: row.authorName,
      embeddingStatus: row.embeddingStatus,
      dataSourceName: row.dataSourceName,
      publishedAt: row.publishedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      confidence: row.confidence,
      qualityScore: row.qualityScore,
      terms: termsByDocumentId.get(row.id) ?? [],
    })),
    hasMore,
    offset,
    limit,
    rootCount: pageRootIds.length,
  };
}
