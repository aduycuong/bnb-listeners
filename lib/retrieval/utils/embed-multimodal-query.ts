import { z } from "zod";

import { CHUNK_MULTIMODAL_EMBEDDING_DIMENSIONS } from "@/db/pgvector";
import {
  MULTIMODAL_EMBEDDING_MODEL,
  VOYAGE_MULTIMODAL_ENDPOINT,
} from "@/lib/chunking/utils/social-chunks/config";

const voyageResponseSchema = z.object({
  data: z.array(
    z.object({
      index: z.int(),
      embedding: z.array(z.number()),
    }),
  ),
});

/**
 * Embeds a text search query with voyage-multimodal-3.5 for retrieval against
 * chunks.embedding_multimodal. Returns null when VOYAGE_API_KEY is missing so
 * search can fall back to text vector + FTS only.
 */
export async function embedMultimodalQuery(
  text: string,
): Promise<number[] | null> {
  const apiKey = process.env.VOYAGE_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }

  const response = await fetch(VOYAGE_MULTIMODAL_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MULTIMODAL_EMBEDDING_MODEL,
      input_type: "query",
      output_dimension: CHUNK_MULTIMODAL_EMBEDDING_DIMENSIONS,
      inputs: [
        {
          content: [{ type: "text", text }],
        },
      ],
    }),
  });

  const responseText = await response.text();
  let json: unknown;

  try {
    json = JSON.parse(responseText);
  } catch {
    console.warn(
      "[embed-multimodal-query] Voyage returned non-JSON response; skipping multimodal search.",
    );
    return null;
  }

  if (!response.ok) {
    console.warn(
      `[embed-multimodal-query] Voyage request failed (${response.status}); skipping multimodal search.`,
      json,
    );
    return null;
  }

  const parsed = voyageResponseSchema.safeParse(json);
  if (!parsed.success || parsed.data.data.length !== 1) {
    console.warn(
      "[embed-multimodal-query] Unexpected Voyage response; skipping multimodal search.",
    );
    return null;
  }

  const [item] = [...parsed.data.data].sort((a, b) => a.index - b.index);
  if (!item || item.embedding.length !== CHUNK_MULTIMODAL_EMBEDDING_DIMENSIONS) {
    console.warn(
      "[embed-multimodal-query] Voyage returned an invalid embedding dimension; skipping multimodal search.",
    );
    return null;
  }

  return item.embedding;
}
