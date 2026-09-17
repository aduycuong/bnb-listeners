import { and, eq } from "drizzle-orm";

import { documentTerms, documents } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import { DOCUMENT_TERM_ASSIGNED_BY } from "@/lib/document-terms/document-term-config";
import { invalidateTermDigest } from "@/lib/term-digests/services/invalidate-term-digest";

import { DISCUSSION_DOC_TYPE } from "../config";
import { findDiscussionDocumentId } from "../utils/find-discussion-document-id";

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Mirrors every term assignment from a parent post onto its companion
 * discussion document as `parent_mirror` rows.
 *
 * Only previous `parent_mirror` rows are replaced. Terms the discussion
 * earned on its own (`llm_classifier`, `admin`, …) are left untouched; when
 * the parent shares one of those terms the existing row wins (no duplicate).
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

  const mirrorFilter = and(
    eq(documentTerms.documentId, discussionDocumentId),
    eq(documentTerms.assignedBy, DOCUMENT_TERM_ASSIGNED_BY.parentMirror),
  );

  const [parentTerms, oldMirrorTerms] = await Promise.all([
    db
      .select({
        termId: documentTerms.termId,
        confidence: documentTerms.confidence,
      })
      .from(documentTerms)
      .where(eq(documentTerms.documentId, parentDocumentId)),
    db
      .select({ termId: documentTerms.termId })
      .from(documentTerms)
      .where(mirrorFilter),
  ]);

  await db.delete(documentTerms).where(mirrorFilter);

  if (parentTerms.length > 0) {
    await db
      .insert(documentTerms)
      .values(
        parentTerms.map((row) => ({
          documentId: discussionDocumentId,
          termId: row.termId,
          confidence: row.confidence,
          assignedBy: DOCUMENT_TERM_ASSIGNED_BY.parentMirror,
        })),
      )
      .onConflictDoNothing();
  }

  if (discussion?.publishedAt) {
    const dateKey = toDateKey(discussion.publishedAt);
    const affectedTermIds = [
      ...new Set([
        ...oldMirrorTerms.map((row) => row.termId),
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
