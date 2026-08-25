import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

import { CHUNK_OVERLAP_CHARACTERS, CHUNK_TARGET_CHARACTERS } from "../config";
import type { ChunkStrategy, DocumentChunk } from "../types";

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: CHUNK_TARGET_CHARACTERS,
  chunkOverlap: CHUNK_OVERLAP_CHARACTERS,
});

/**
 * Splits content into fixed-size overlapping chunks using recursive character
 * splitting. Use for freeform prose (reviews, comments, social posts) where
 * document structure cannot be relied upon.
 */
export async function chunkRecursiveByToken(
  markdown: string,
  strategy: ChunkStrategy,
): Promise<DocumentChunk[]> {
  const parts = await splitter.splitText(markdown);

  return parts.map((text, index) => ({
    index,
    text,
    metadata: { strategy },
  }));
}
