import { OpenAIEmbeddings } from "@langchain/openai";

import { EMBEDDING_MODEL } from "@/lib/chunking/config";

export async function embedQuery(text: string): Promise<number[]> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const embeddings = new OpenAIEmbeddings({ model: EMBEDDING_MODEL });
  const [vector] = await embeddings.embedDocuments([text]);

  if (!vector) {
    throw new Error("Failed to embed query.");
  }

  return vector;
}
