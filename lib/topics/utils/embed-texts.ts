import { OpenAIEmbeddings } from "@langchain/openai";

import { TOPIC_CONFIG } from "../config";

/** Embeds texts with the topic embedding model; vectors align with `texts`. */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  if (!process.env.OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY.");
  const embeddings = new OpenAIEmbeddings({
    model: TOPIC_CONFIG.embeddingModel,
    batchSize: TOPIC_CONFIG.embedPerRequest,
  });
  return embeddings.embedDocuments(texts);
}
