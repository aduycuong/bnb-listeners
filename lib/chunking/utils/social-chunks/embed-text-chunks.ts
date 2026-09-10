import { OpenAIEmbeddings } from "@langchain/openai";

import { APIError } from "@/lib/exposers/api-error";

import { EMBEDDING_MODEL } from "../../config";

/**
 * Embeds chunk text with the workspace text model, returning vectors
 * positionally aligned with `texts`.
 *
 * Every chunk goes through here — including media chunks — because
 * chunks.embedding is NOT NULL and the media chunk's paired snippet is itself
 * useful text. Batching is handled by the OpenAI client.
 */
export async function embedTextChunks(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  if (!process.env.OPENAI_API_KEY) {
    throw new APIError(
      "ERR_OPENAI_NOT_CONFIGURED",
      "Missing OPENAI_API_KEY.",
      503,
    );
  }

  const embeddings = new OpenAIEmbeddings({ model: EMBEDDING_MODEL });
  return embeddings.embedDocuments(texts);
}
