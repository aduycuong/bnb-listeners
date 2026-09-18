import { and, eq } from "drizzle-orm";

import { documents } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import { RETRIEVAL_RETURN_LIMIT } from "@/lib/retrieval/config";
import { searchChunks } from "@/lib/retrieval/services/search-chunks";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import type {
  SearchDocumentChunkItem,
  SearchDocumentChunksParams,
  SearchDocumentChunksResult,
} from "../types";

export async function searchDocumentChunks(
  params: SearchDocumentChunksParams,
  ctx: WorkspaceContext,
): Promise<SearchDocumentChunksResult> {
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

  const chunks = await searchChunks({
    workspaceId: ctx.workspaceId,
    query: params.query,
    limit: params.limit ?? RETRIEVAL_RETURN_LIMIT,
    documentId: params.id,
    includeScores: true,
  });

  const items: SearchDocumentChunkItem[] = chunks.map((chunk) => ({
    id: chunk.id,
    chunkIndex: chunk.chunkIndex,
    content: chunk.content,
    qualityScore: chunk.qualityScore,
    rrfScore: chunk.rrfScore,
    similarityScore: chunk.similarityScore,
    multimodalSimilarityScore: chunk.multimodalSimilarityScore,
    ftsScore: chunk.ftsScore,
  }));

  return {
    query: params.query,
    items,
  };
}
