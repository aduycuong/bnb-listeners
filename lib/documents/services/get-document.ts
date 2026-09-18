import { and, eq } from "drizzle-orm";

import { documents, dataSources } from "@/db/schema";
import { DISCUSSION_DOC_TYPE } from "@/lib/comments/config";
import { findDiscussionDocumentId } from "@/lib/comments/utils/find-discussion-document-id";
import { findDiscussionParentDocument } from "@/lib/comments/utils/find-discussion-parent-document";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import type { GetDocumentParams, GetDocumentResult } from "../types";
import { fetchDocumentTermNamesMap } from "../utils/fetch-document-term-names-map";

export async function getDocument(
  params: GetDocumentParams,
  ctx: WorkspaceContext,
): Promise<GetDocumentResult> {
  const [row] = await db
    .select({
      document: documents,
      dataSourceId: dataSources.id,
      dataSourceName: dataSources.name,
      sourceType: dataSources.sourceType,
    })
    .from(documents)
    .innerJoin(dataSources, eq(documents.dataSourceId, dataSources.id))
    .where(
      and(
        eq(documents.id, params.id),
        eq(documents.workspaceId, ctx.workspaceId),
      ),
    )
    .limit(1);

  if (!row) {
    throw new NotFoundError("document", params.id);
  }

  const termsByDocumentId = await fetchDocumentTermNamesMap([params.id]);
  const discussionDocumentId =
    row.document.docType === DISCUSSION_DOC_TYPE
      ? null
      : await findDiscussionDocumentId({
          workspaceId: ctx.workspaceId,
          sourceOriginKey: row.document.sourceOriginKey,
          sourceItemId: row.document.sourceItemId,
        });
  const parent = await findDiscussionParentDocument({
    workspaceId: ctx.workspaceId,
    docType: row.document.docType,
    sourceOriginKey: row.document.sourceOriginKey,
    sourceItemId: row.document.sourceItemId,
    metadata: row.document.metadata,
  });
  const parentDocumentId = parent?.id ?? null;

  return {
    ...row.document,
    dataSourceId: row.dataSourceId,
    dataSourceName: row.dataSourceName,
    sourceType: row.sourceType,
    terms: termsByDocumentId.get(params.id) ?? [],
    discussionDocumentId,
    parentDocumentId,
  };
}
