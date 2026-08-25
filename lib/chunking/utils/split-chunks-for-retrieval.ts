import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

import { CHUNK_OVERLAP_CHARACTERS, CHUNK_TARGET_CHARACTERS } from "../config";
import type { DocumentChunk, DocumentChunkMetadata } from "../types";

function getContextPrefix(metadata: DocumentChunkMetadata): string {
  const headingPath = metadata.headingPath?.filter(Boolean).join(" > ");
  const context = headingPath ?? metadata.sectionTitle;
  if (!context) return "";
  return `Document context: ${context.slice(0, 400)}`;
}

/**
 * Post-processes logical chunks so each fits within CHUNK_TARGET_CHARACTERS.
 *
 * Each logical chunk is re-split using its context prefix as a fixed overhead,
 * leaving the remaining budget for content. The context prefix is prepended to
 * every resulting retrieval chunk so it is self-contained for embedding.
 *
 * Chunks that already fit within the budget are passed through unchanged.
 */
export async function splitChunksForRetrieval(
  chunks: DocumentChunk[],
): Promise<DocumentChunk[]> {
  const result: DocumentChunk[] = [];

  for (const chunk of chunks) {
    const contextPrefix = getContextPrefix(chunk.metadata);
    const contentBudget = Math.max(
      200,
      CHUNK_TARGET_CHARACTERS - contextPrefix.length - 2,
    );
    const contentSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: contentBudget,
      chunkOverlap: Math.min(
        CHUNK_OVERLAP_CHARACTERS,
        Math.floor(contentBudget / 4),
      ),
    });

    const parts = await contentSplitter.splitText(chunk.text);
    const totalParts = parts.length;

    for (const [partIndex, part] of parts.entries()) {
      result.push({
        index: result.length,
        text: contextPrefix ? `${contextPrefix}\n\n${part}` : part,
        metadata: {
          ...chunk.metadata,
          sourceChunkIndex: chunk.index,
          partIndex,
          partCount: totalParts,
        },
      });
    }
  }

  return result;
}
