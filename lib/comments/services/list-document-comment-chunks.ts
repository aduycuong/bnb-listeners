import { and, asc, eq } from "drizzle-orm";

import { chunks, documents } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import type { DocumentChunkListItem } from "@/lib/chunking/types";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import { DISCUSSION_DOC_TYPE } from "../config";
import type {
  ListDocumentCommentChunksParams,
  ListDocumentCommentChunksResult,
} from "../types";

export async function listDocumentCommentChunks(
  params: ListDocumentCommentChunksParams,
  ctx: WorkspaceContext,
): Promise<ListDocumentCommentChunksResult> {
  const [parent] = await db
    .select({
      id: documents.id,
      sourceKey: documents.sourceKey,
      sourceId: documents.sourceId,
    })
    .from(documents)
    .where(
      and(
        eq(documents.id, params.id),
        eq(documents.workspaceId, ctx.workspaceId),
      ),
    )
    .limit(1);

  if (!parent) {
    throw new NotFoundError("document", params.id);
  }

  const [discussion] = await db
    .select({ id: documents.id, embeddingStatus: documents.embeddingStatus })
    .from(documents)
    .where(
      and(
        eq(documents.workspaceId, ctx.workspaceId),
        eq(documents.docType, DISCUSSION_DOC_TYPE),
        eq(documents.sourceKey, parent.sourceKey),
        eq(documents.sourceId, parent.sourceId),
      ),
    )
    .limit(1);

  if (!discussion) {
    return {
      discussionDocumentId: null,
      embeddingStatus: null,
      items: [],
      total: 0,
    };
  }

  const rows = await db
    .select({
      id: chunks.id,
      chunkIndex: chunks.chunkIndex,
      content: chunks.content,
      contentType: chunks.contentType,
      mediaUrl: chunks.mediaUrl,
      metadata: chunks.metadata,
      mediaMetadata: chunks.mediaMetadata,
      topicIds: chunks.topicIds,
      createdAt: chunks.createdAt,
    })
    .from(chunks)
    .where(eq(chunks.documentId, discussion.id))
    .orderBy(asc(chunks.chunkIndex));

  const items: DocumentChunkListItem[] = rows.map((row) => ({
    id: row.id,
    chunkIndex: row.chunkIndex,
    content: row.content,
    contentType: row.contentType,
    mediaUrl: row.mediaUrl,
    metadata: row.metadata,
    mediaMetadata: row.mediaMetadata,
    topicIds: row.topicIds,
    createdAt: row.createdAt.toISOString(),
  }));

  return {
    discussionDocumentId: discussion.id,
    embeddingStatus: discussion.embeddingStatus,
    items,
    total: items.length,
  };
}
