import { and, desc, eq, sql } from "drizzle-orm";

import { comments, documents } from "@/db/schema";
import { db } from "@/lib/db";

import { DOCUMENT_COMMENTS_PAGE_SIZE } from "../config";
import type {
  DocumentCommentItem,
  GetDocumentCommentsParams,
  GetDocumentCommentsResult,
} from "../types";

/**
 * Fetches paginated comments for a document directly from the `comments` table.
 *
 * Used by the MCP `get_document_comments` tool so AI agents can retrieve
 * community discussion for a post after finding it via search.
 */
export async function getDocumentComments(
  params: GetDocumentCommentsParams,
): Promise<GetDocumentCommentsResult> {
  const offset = params.offset ?? 0;

  const [document] = await db
    .select({ id: documents.id })
    .from(documents)
    .where(
      and(
        eq(documents.id, params.documentId),
        eq(documents.workspaceId, params.workspaceId),
      ),
    )
    .limit(1);

  if (!document) return { found: false };

  const rows = await db
    .select({
      id: comments.id,
      sourceItemId: comments.sourceItemId,
      authorName: comments.authorName,
      content: comments.content,
      likeCount: comments.likeCount,
      publishedAt: comments.publishedAt,
      role: comments.role,
      stance: comments.stance,
      isSubstantive: comments.isSubstantive,
      scoredAt: comments.scoredAt,
      createdAt: comments.createdAt,
    })
    .from(comments)
    .where(eq(comments.documentId, params.documentId))
    .orderBy(
      sql`${comments.publishedAt} DESC NULLS LAST`,
      desc(comments.createdAt),
    )
    .limit(DOCUMENT_COMMENTS_PAGE_SIZE + 1)
    .offset(offset);

  const pageRows = rows.slice(0, DOCUMENT_COMMENTS_PAGE_SIZE);
  const hasMore = rows.length > DOCUMENT_COMMENTS_PAGE_SIZE;

  const items: DocumentCommentItem[] = pageRows.map((row) => ({
    id: row.id,
    sourceItemId: row.sourceItemId,
    authorName: row.authorName,
    content: row.content,
    likeCount: row.likeCount,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    role: row.role,
    stance: row.stance,
    isSubstantive: row.isSubstantive,
    scoredAt: row.scoredAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  }));

  return {
    found: true,
    items,
    offset,
    hasMore,
  };
}
