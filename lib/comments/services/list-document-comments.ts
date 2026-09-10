import { and, asc, eq } from "drizzle-orm";

import { comments, documents } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import type {
  CommentListItem,
  ListDocumentCommentsParams,
  ListDocumentCommentsResult,
} from "../types";

export async function listDocumentComments(
  params: ListDocumentCommentsParams,
  ctx: WorkspaceContext,
): Promise<ListDocumentCommentsResult> {
  const [document] = await db
    .select({ id: documents.id })
    .from(documents)
    .where(
      and(
        eq(documents.id, params.id),
        eq(documents.workspaceId, ctx.workspaceId),
      ),
    )
    .limit(1);

  if (!document) {
    throw new NotFoundError("document", params.id);
  }

  const rows = await db
    .select({
      id: comments.id,
      sourceId: comments.sourceId,
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
    .where(eq(comments.documentId, params.id))
    .orderBy(asc(comments.publishedAt), asc(comments.createdAt));

  const items: CommentListItem[] = rows.map((row) => ({
    id: row.id,
    sourceId: row.sourceId,
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
    items,
    total: items.length,
  };
}
