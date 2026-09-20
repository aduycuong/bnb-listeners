import { eq } from "drizzle-orm";

import { chunks, documents } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import { getEligibleDocumentParts } from "@/lib/document-parts/services/get-eligible-document-parts";
import type { DocumentPartRow } from "@/lib/document-parts/types";

import type {
  RebuildDocumentChunksParams,
  RebuildDocumentChunksResult,
} from "../types";
import { createChunkRecords } from "../utils/social-chunks/create-chunk-records";
import { createChunks } from "../utils/social-chunks/create-chunks";
import type { ChunkablePart } from "../utils/social-chunks/types";

/**
 * Rebuilds the chunk set for one document from its eligible parts: split,
 * embed, then replace.
 *
 * Deleting the existing chunks first makes this idempotent, so it is safe to
 * re-run from the pipeline or from scripts/rebuild-chunks.ts.
 *
 * embedding_status becomes `chunked` when at least one chunk was written and
 * `rejected` when no part was eligible, so a document never sits in `pending`
 * after it has been processed.
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

  const eligibleParts = await getEligibleDocumentParts(documentId);
  const chunkableParts = eligibleParts
    .map(toChunkablePart)
    .filter((part): part is ChunkablePart => part !== null);

  const built = await createChunks({
    parts: chunkableParts,
    context: {
      author: readString(doc.metadata, "authorName"),
      sourceOriginName: doc.sourceOriginName,
    },
  });

  const records =
    built.length > 0
      ? await createChunkRecords({
          documentId,
          docType: doc.docType,
          publishedAt: doc.publishedAt,
          chunks: built,
        })
      : [];

  await db.delete(chunks).where(eq(chunks.documentId, documentId));

  if (records.length > 0) {
    await db.insert(chunks).values(records);
  }

  await db
    .update(documents)
    .set({ embeddingStatus: records.length > 0 ? "chunked" : "rejected" })
    .where(eq(documents.id, documentId));

  return {
    documentId,
    eligibleParts: eligibleParts.length,
    chunksCreated: records.length,
    textChunks: built.filter((chunk) => chunk.contentType === "text").length,
    mediaChunks: built.filter((chunk) => chunk.contentType !== "text").length,
  };
}

/**
 * Text parts chunk their body; media parts chunk their LLM summary and point
 * at the archived media. A media part without a summary or storage URL cannot
 * produce a self-contained chunk and is skipped.
 */
function toChunkablePart(part: DocumentPartRow): ChunkablePart | null {
  const partScore = part.partScore ?? 0;

  if (part.contentType === "text") {
    return {
      partId: part.id,
      partIndex: part.partIndex,
      contentType: "text",
      text: part.value,
      mediaUrl: null,
      sourceUrl: null,
      partScore,
    };
  }

  if (!part.summary || !part.storageUrl) return null;

  return {
    partId: part.id,
    partIndex: part.partIndex,
    contentType: part.contentType,
    text: part.summary,
    mediaUrl: part.storageUrl,
    sourceUrl: part.value,
    partScore,
  };
}

function readString(
  metadata: Record<string, unknown>,
  key: string,
): string | null {
  const value = metadata[key];
  return typeof value === "string" && value.trim() ? value : null;
}
