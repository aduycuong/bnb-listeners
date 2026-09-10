import type { NewChunk } from "@/db/schema";
import { APIError } from "@/lib/exposers/api-error";

import { EMBEDDING_MODEL, EMBEDDING_VERSION } from "../../config";
import { MULTIMODAL_EMBEDDING_MODEL } from "./config";
import { embedMultimodalChunks } from "./embed-multimodal-chunks";
import { embedTextChunks } from "./embed-text-chunks";
import type {
  CreateChunkRecordsParams,
  CreatedChunk,
  MultimodalEmbedInput,
} from "./types";

/**
 * Turns built chunks into `chunks` rows ready for insert. No database writes —
 * the caller owns the transaction and any delete-then-insert idempotency.
 *
 * Every chunk's content is embedded with the text model because
 * chunks.embedding is NOT NULL. Chunks carrying a mediaUrl are additionally
 * embedded with the multimodal model into chunks.embedding_multimodal.
 *
 * A failing multimodal call leaves those chunks with a null multimodal vector
 * rather than failing the whole document: text retrieval still works and the
 * partial index on embedding_multimodal simply skips them. A missing
 * VOYAGE_API_KEY is a configuration error and still throws.
 */
export async function createChunkRecords(
  params: CreateChunkRecordsParams,
): Promise<NewChunk[]> {
  const {
    documentId,
    docType,
    publishedAt,
    chunks,
    topicIds = [],
    qualityScore = null,
  } = params;

  if (chunks.length === 0) return [];

  const textVectors = await embedTextChunks(
    chunks.map((chunk) => chunk.content),
  );
  const multimodalByPosition = await embedMedia(chunks, documentId);

  return chunks.map((chunk, position) => {
    const multimodal = multimodalByPosition.get(position) ?? null;

    return {
      documentId,
      chunkIndex: chunk.chunkIndex,
      content: chunk.content,
      embedding: textVectors[position],
      docType,
      publishedAt,
      metadata: { ...chunk.metadata },
      embeddingModel: EMBEDDING_MODEL,
      embeddingVersion: EMBEDDING_VERSION,
      contentType: chunk.contentType,
      mediaUrl: chunk.mediaUrl,
      mediaMetadata: chunk.mediaMetadata
        ? {
            ...chunk.mediaMetadata,
            ...(multimodal
              ? { embeddingModel: MULTIMODAL_EMBEDDING_MODEL }
              : {}),
          }
        : null,
      embeddingMultimodal: multimodal,
      topicIds,
      qualityScore,
    };
  });
}

/**
 * Embeds the media chunks and maps the vectors back onto their position in the
 * original chunk list. Returns an empty map when there is no media.
 */
async function embedMedia(
  chunks: CreatedChunk[],
  documentId: string,
): Promise<Map<number, number[]>> {
  const byPosition = new Map<number, number[]>();
  const positions: number[] = [];
  const inputs: MultimodalEmbedInput[] = [];

  for (const [position, chunk] of chunks.entries()) {
    if (chunk.contentType === "text" || !chunk.mediaUrl) continue;

    positions.push(position);
    inputs.push({
      text: chunk.content,
      mediaUrl: chunk.mediaUrl,
      kind: chunk.contentType,
    });
  }

  if (inputs.length === 0) return byPosition;

  let vectors: number[][];

  try {
    vectors = await embedMultimodalChunks(inputs);
  } catch (err) {
    if (err instanceof APIError && err.code === "ERR_VOYAGE_NOT_CONFIGURED") {
      throw err;
    }

    console.warn(
      `[create-chunk-records] Multimodal embedding failed for document ${documentId} — ` +
        `${inputs.length} media chunk(s) stored without a multimodal vector: ` +
        `${err instanceof Error ? err.message : String(err)}`,
    );
    return byPosition;
  }

  for (const [i, position] of positions.entries()) {
    const vector = vectors[i];
    if (vector) byPosition.set(position, vector);
  }

  return byPosition;
}
