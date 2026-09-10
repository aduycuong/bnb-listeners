import { and, asc, eq } from "drizzle-orm";

import { comments, documents } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import { upsertDocument } from "@/lib/documents/services/upsert-document";

import { DISCUSSION_DOC_TYPE } from "../config";
import { buildDiscussionContent } from "../utils/build-discussion-content";

export type SyncDiscussionDocumentResult = {
  discussionDocumentId: string | null;
  outcome: "inserted" | "updated" | "unchanged" | "deleted" | "skipped";
  substantiveCount: number;
};

/**
 * Rebuilds (or removes) the companion `discussion` document for a parent post.
 *
 * Uses the same sourceKey/sourceId as the parent with doc_type = "discussion",
 * so the unique key keeps post and discussion as two rows without colliding.
 * Only substantive comments are included — noise stays in the comments table
 * for debate tallies but never enters the retrieval index.
 */
export async function syncDiscussionDocument(
  documentId: string,
  userId = "system",
): Promise<SyncDiscussionDocumentResult> {
  const [parent] = await db
    .select()
    .from(documents)
    .where(eq(documents.id, documentId))
    .limit(1);

  if (!parent) throw new NotFoundError("document", documentId);

  // Never nest a discussion under another discussion.
  if (parent.docType === DISCUSSION_DOC_TYPE) {
    return {
      discussionDocumentId: null,
      outcome: "skipped",
      substantiveCount: 0,
    };
  }

  const substantive = await db
    .select({
      authorName: comments.authorName,
      content: comments.content,
      publishedAt: comments.publishedAt,
      role: comments.role,
      stance: comments.stance,
      likeCount: comments.likeCount,
    })
    .from(comments)
    .where(
      and(
        eq(comments.documentId, documentId),
        eq(comments.isSubstantive, true),
      ),
    )
    .orderBy(asc(comments.publishedAt), asc(comments.createdAt));

  const [existingDiscussion] = await db
    .select({ id: documents.id })
    .from(documents)
    .where(
      and(
        eq(documents.workspaceId, parent.workspaceId),
        eq(documents.docType, DISCUSSION_DOC_TYPE),
        eq(documents.sourceKey, parent.sourceKey),
        eq(documents.sourceId, parent.sourceId),
      ),
    )
    .limit(1);

  if (substantive.length === 0) {
    if (existingDiscussion) {
      await db
        .delete(documents)
        .where(eq(documents.id, existingDiscussion.id));
      return {
        discussionDocumentId: null,
        outcome: "deleted",
        substantiveCount: 0,
      };
    }

    return {
      discussionDocumentId: null,
      outcome: "skipped",
      substantiveCount: 0,
    };
  }

  const rawContent = buildDiscussionContent(substantive);
  const title = parent.title?.trim()
    ? `Thảo luận: ${parent.title.trim()}`
    : `Thảo luận về bài ${parent.sourceId}`;

  const result = await upsertDocument(
    {
      docType: DISCUSSION_DOC_TYPE,
      sourceKey: parent.sourceKey,
      sourceName: parent.sourceName,
      sourceId: parent.sourceId,
      title,
      rawContent,
      metadata: {
        parentDocumentId: parent.id,
        parentDocType: parent.docType,
        substantiveCommentCount: substantive.length,
      },
      engagement: {
        likeCount: substantive.reduce((sum, c) => sum + c.likeCount, 0),
        commentCount: substantive.length,
        shareCount: 0,
        viewCount: 0,
      },
      publishedAt: parent.publishedAt
        ? parent.publishedAt.toISOString()
        : undefined,
      jobId: parent.jobId,
      jobRunId: parent.jobRunId ?? undefined,
    },
    parent.workspaceId,
    userId,
  );

  return {
    discussionDocumentId: result.documentId,
    outcome: result.outcome,
    substantiveCount: substantive.length,
  };
}
