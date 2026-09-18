import { OpenAIEmbeddings } from "@langchain/openai";

import { EMBEDDING_MODEL } from "@/lib/chunking/config";
import { UnknownServiceError } from "@/lib/common/service-errors";

/**
 * Embeds term texts (see `buildTermEmbeddingText`) with the same model used
 * for `chunks.embedding`, returning vectors positionally aligned with `texts`.
 */
export async function embedTermTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  if (!process.env.OPENAI_API_KEY) {
    throw new UnknownServiceError("OPENAI_API_KEY is not configured.");
  }

  const embeddings = new OpenAIEmbeddings({ model: EMBEDDING_MODEL });
  const vectors = await embeddings.embedDocuments(texts);

  if (vectors.length !== texts.length) {
    throw new UnknownServiceError(
      `Embedding count mismatch: expected ${texts.length}, got ${vectors.length}.`,
    );
  }

  return vectors;
}
