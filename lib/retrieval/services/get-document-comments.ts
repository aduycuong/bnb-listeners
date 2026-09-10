import { and, eq } from "drizzle-orm";

import { documents } from "@/db/schema";
import { DISCUSSION_DOC_TYPE } from "@/lib/comments/config";
import { db } from "@/lib/db";

export type GetDocumentCommentsResult =
  | { found: false }
  | {
      found: true;
      documentId: string;
      title: string | null;
      content: string;
      commentCount: number;
      publishedAt: string | null;
    };

/**
 * Fetches the companion `discussion` document for a given parent document.
 *
 * Used by the MCP `get_document_comments` tool so AI agents can explicitly
 * retrieve the community discussion for a post after finding it via search.
 */
export async function getDocumentComments(
  parentDocumentId: string,
): Promise<GetDocumentCommentsResult> {
  const [parent] = await db
    .select({
      workspaceId: documents.workspaceId,
      sourceKey: documents.sourceKey,
      sourceId: documents.sourceId,
    })
    .from(documents)
    .where(eq(documents.id, parentDocumentId))
    .limit(1);

  if (!parent) return { found: false };

  const [discussion] = await db
    .select({
      id: documents.id,
      title: documents.title,
      rawContent: documents.rawContent,
      commentCount: documents.commentCount,
      publishedAt: documents.publishedAt,
    })
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

  if (!discussion) return { found: false };

  return {
    found: true,
    documentId: discussion.id,
    title: discussion.title,
    content: discussion.rawContent,
    commentCount: discussion.commentCount,
    publishedAt: discussion.publishedAt
      ? discussion.publishedAt.toISOString()
      : null,
  };
}
