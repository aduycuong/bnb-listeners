import { and, eq, exists, inArray, notExists, sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

import { documentTerms } from "@/db/schema";
import { db } from "@/lib/db";

import type { DocumentTermFilterMode } from "../document-term-filter-config";

type DocumentFilterTable = {
  workspaceId: AnyPgColumn;
  docType: AnyPgColumn;
  embeddingStatus: AnyPgColumn;
  dataSourceId: AnyPgColumn;
  publishedAt: AnyPgColumn;
  createdAt: AnyPgColumn;
};

type ListDocumentFilterParams = {
  workspaceId: string;
  docType?: string;
  embeddingStatus?: string;
  dataSourceIds?: string[];
};

export function buildListDocumentFilterConditions(
  doc: DocumentFilterTable,
  params: ListDocumentFilterParams,
): SQL[] {
  const conditions = [eq(doc.workspaceId, params.workspaceId)];

  if (params.docType) {
    conditions.push(eq(doc.docType, params.docType));
  }

  if (params.embeddingStatus) {
    conditions.push(eq(doc.embeddingStatus, params.embeddingStatus));
  }

  if (params.dataSourceIds && params.dataSourceIds.length > 0) {
    conditions.push(inArray(doc.dataSourceId, params.dataSourceIds));
  }

  return conditions;
}

export function buildListDocumentTermFilterCondition(
  documentId: AnyPgColumn,
  termFilterMode: DocumentTermFilterMode | undefined,
  termIds: string[] | undefined,
) {
  if (termFilterMode === "none") {
    return notExists(
      db
        .select({ one: sql`1` })
        .from(documentTerms)
        .where(eq(documentTerms.documentId, documentId)),
    );
  }

  if (termFilterMode === "selected" && termIds && termIds.length > 0) {
    return exists(
      db
        .select({ one: sql`1` })
        .from(documentTerms)
        .where(
          and(
            eq(documentTerms.documentId, documentId),
            inArray(documentTerms.termId, termIds),
          ),
        ),
    );
  }

  return undefined;
}

export function documentListSortTimestamp(
  doc: Pick<DocumentFilterTable, "publishedAt" | "createdAt">,
) {
  return sql`COALESCE(${doc.publishedAt}, ${doc.createdAt})`;
}
