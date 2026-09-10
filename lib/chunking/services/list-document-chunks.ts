import { and, asc, eq } from "drizzle-orm";

import { chunks, documents } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import type {
  DocumentChunkListItem,
  ListDocumentChunksParams,
  ListDocumentChunksResult,
} from "../types";

export async function listDocumentChunks(
  params: ListDocumentChunksParams,
  ctx: WorkspaceContext,
): Promise<ListDocumentChunksResult> {
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
    .where(eq(chunks.documentId, params.id))
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
    items,
    total: items.length,
  };
}
