import { eq } from "drizzle-orm";

import { chunks, documents } from "@/db/schema";
import { db } from "@/lib/db";

import { EMBEDDING_MODEL, EMBEDDING_VERSION } from "../config";
import type { StoreChunksParams } from "../types";

/**
 * Persists retrieval chunks for a document.
 * Deletes existing chunks first for idempotency, then inserts the new ones
 * and marks embedding_status = 'chunked' on the document.
 * When retrievalChunks is empty, skips delete/insert and only marks status.
 *
 * Returns the number of chunks written.
 */
export async function storeChunks(params: StoreChunksParams): Promise<number> {
  const { documentId, retrievalChunks, vectors, qualityScore, docType, publishedAt } = params;

  if (retrievalChunks.length > 0) {
    await db.delete(chunks).where(eq(chunks.documentId, documentId));

    await db.insert(chunks).values(
      retrievalChunks.map((chunk, i) => ({
        documentId,
        chunkIndex: chunk.index,
        content: chunk.text,
        embedding: vectors[i],
        docType,
        publishedAt: publishedAt ?? null,
        metadata: chunk.metadata as Record<string, unknown>,
        embeddingModel: EMBEDDING_MODEL,
        embeddingVersion: EMBEDDING_VERSION,
        qualityScore,
      })),
    );
  }

  await db
    .update(documents)
    .set({ embeddingStatus: "chunked" })
    .where(eq(documents.id, documentId));

  return retrievalChunks.length;
}
