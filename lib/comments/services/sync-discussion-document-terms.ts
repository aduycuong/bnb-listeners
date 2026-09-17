import { and, eq } from "drizzle-orm";

import { documentTerms, documents } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import { invalidateTermDigest } from "@/lib/term-digests/services/invalidate-term-digest";

import { DISCUSSION_DOC_TYPE } from "../config";

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

async function findDiscussionDocumentId(params: {
  workspaceId: string;
  sourceOriginKey: string;
  sourceItemId: string;
}): Promise<string | null> {
  const [discussion] = await db
    .select({ id: documents.id })
    .from(documents)
    .where(
      and(
        eq(documents.workspaceId, params.workspaceId),
        eq(documents.docType, DISCUSSION_DOC_TYPE),
        eq(documents.sourceOriginKey, params.sourceOriginKey),
        eq(documents.sourceItemId, params.sourceItemId),
      ),
    )
    .limit(1);

  return discussion?.id ?? null;
}

/**
 * Mirrors every term assignment from a parent post onto its companion
 * discussion document. Discussion documents are never classified directly.
 */
export async function syncDiscussionDocumentTerms(
  parentDocumentId: string,
): Promise<{ discussionDocumentId: string | null; synced: boolean }> {
  const [parent] = await db
    .select({
      id: documents.id,
      workspaceId: documents.workspaceId,
      docType: documents.docType,
      sourceOriginKey: documents.sourceOriginKey,
      sourceItemId: documents.sourceItemId,
    })
    .from(documents)
    .where(eq(documents.id, parentDocumentId))
    .limit(1);

  if (!parent) {
    throw new NotFoundError("document", parentDocumentId);
  }

  if (parent.docType === DISCUSSION_DOC_TYPE) {
    return { discussionDocumentId: null, synced: false };
  }

  const discussionDocumentId = await findDiscussionDocumentId({
    workspaceId: parent.workspaceId,
    sourceOriginKey: parent.sourceOriginKey,
    sourceItemId: parent.sourceItemId,
  });

  if (!discussionDocumentId) {
    return { discussionDocumentId: null, synced: false };
  }

  const [discussion] = await db
    .select({
      publishedAt: documents.publishedAt,
      dataSourceId: documents.dataSourceId,
    })
    .from(documents)
    .where(eq(documents.id, discussionDocumentId))
    .limit(1);

  const [parentTerms, oldDiscussionTerms] = await Promise.all([
    db
      .select({
        termId: documentTerms.termId,
        confidence: documentTerms.confidence,
        assignedBy: documentTerms.assignedBy,
      })
      .from(documentTerms)
      .where(eq(documentTerms.documentId, parentDocumentId)),
    db
      .select({ termId: documentTerms.termId })
      .from(documentTerms)
      .where(eq(documentTerms.documentId, discussionDocumentId)),
  ]);

  await db
    .delete(documentTerms)
    .where(eq(documentTerms.documentId, discussionDocumentId));

  if (parentTerms.length > 0) {
    await db.insert(documentTerms).values(
      parentTerms.map((row) => ({
        documentId: discussionDocumentId,
        termId: row.termId,
        confidence: row.confidence,
        assignedBy: row.assignedBy,
      })),
    );
  }

  if (discussion?.publishedAt) {
    const dateKey = toDateKey(discussion.publishedAt);
    const affectedTermIds = [
      ...new Set([
        ...oldDiscussionTerms.map((row) => row.termId),
        ...parentTerms.map((row) => row.termId),
      ]),
    ];

    await Promise.all(
      affectedTermIds.map((termId) =>
        invalidateTermDigest({
          termId,
          dateKey,
          dataSourceId: discussion.dataSourceId,
        }),
      ),
    );
  }

  return { discussionDocumentId, synced: true };
}
