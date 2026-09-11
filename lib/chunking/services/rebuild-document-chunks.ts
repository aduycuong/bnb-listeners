import { eq } from "drizzle-orm";

import { chunks, documentTerms, documents } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";

import type {
  RebuildDocumentChunksParams,
  RebuildDocumentChunksResult,
} from "../types";
import { createChunkRecords } from "../utils/social-chunks/create-chunk-records";
import { createChunks } from "../utils/social-chunks/create-chunks";

/**
 * Rebuilds the chunk set for one document: split, embed, then replace.
 *
 * Deleting the existing chunks first makes this idempotent, so it is safe to
 * re-run from the pipeline or from scripts/rebuild-chunks.ts.
 *
 * Marks embedding_status = 'chunked' even when the document produces no chunks
 * (empty content and no media), so it does not sit in 'pending' forever.
 */
export async function rebuildDocumentChunks(
  params: RebuildDocumentChunksParams,
): Promise<RebuildDocumentChunksResult> {
  const { documentId } = params;

  const [doc] = await db
    .select()
    .from(documents)
    .where(eq(documents.id, documentId))
    .limit(1);

  if (!doc) throw new NotFoundError("document", documentId);

  const built = await createChunks({
    content: doc.rawContent,
    imageUrls: readStringArray(doc.metadata, "imageUrls"),
    videoUrls: readStringArray(doc.metadata, "videoUrls"),
    context: {
      author: readString(doc.metadata, "authorName"),
      sourceName: doc.sourceName,
      publishedAt: doc.publishedAt,
    },
  });

  const records =
    built.length > 0
      ? await createChunkRecords({
          documentId,
          docType: doc.docType,
          publishedAt: doc.publishedAt,
          chunks: built,
          termIds: await fetchTermIds(documentId),
          qualityScore: doc.qualityScore,
          engagement: {
            likeCount: doc.likeCount,
            commentCount: doc.commentCount,
            shareCount: doc.shareCount,
            viewCount: doc.viewCount,
          },
        })
      : [];

  await db.delete(chunks).where(eq(chunks.documentId, documentId));

  if (records.length > 0) {
    await db.insert(chunks).values(records);
  }

  await db
    .update(documents)
    .set({ embeddingStatus: "chunked" })
    .where(eq(documents.id, documentId));

  return {
    documentId,
    chunksCreated: records.length,
    textChunks: built.filter((chunk) => chunk.contentType === "text").length,
    mediaChunks: built.filter((chunk) => chunk.contentType !== "text").length,
  };
}

async function fetchTermIds(documentId: string): Promise<string[]> {
  const rows = await db
    .select({ termId: documentTerms.termId })
    .from(documentTerms)
    .where(eq(documentTerms.documentId, documentId));

  return rows.map((row) => row.termId);
}

function readString(
  metadata: Record<string, unknown>,
  key: string,
): string | null {
  const value = metadata[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function readStringArray(
  metadata: Record<string, unknown>,
  key: string,
): string[] {
  const value = metadata[key];
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}
