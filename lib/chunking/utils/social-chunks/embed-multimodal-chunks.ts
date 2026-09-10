import { z } from "zod";

import { CHUNK_MULTIMODAL_EMBEDDING_DIMENSIONS } from "@/db/pgvector";
import { APIError } from "@/lib/exposers/api-error";

import {
  MULTIMODAL_BATCH_SIZE,
  MULTIMODAL_EMBEDDING_MODEL,
  VOYAGE_MULTIMODAL_ENDPOINT,
} from "./config";
import type { MultimodalEmbedInput } from "./types";

const voyageResponseSchema = z.object({
  data: z.array(
    z.object({
      index: z.int(),
      embedding: z.array(z.number()),
    }),
  ),
});

/**
 * Embeds media chunks with voyage-multimodal-3.5, sending each chunk as an
 * interleaved [text, media URL] input so the vector carries both signals.
 *
 * Voyage resolves the media URLs itself, so nothing is downloaded here.
 * Requests are batched to stay inside the API's combined token budget.
 *
 * Returns vectors positionally aligned with `inputs`.
 */
export async function embedMultimodalChunks(
  inputs: MultimodalEmbedInput[],
): Promise<number[][]> {
  if (inputs.length === 0) return [];

  const apiKey = process.env.VOYAGE_API_KEY;

  if (!apiKey) {
    throw new APIError(
      "ERR_VOYAGE_NOT_CONFIGURED",
      "Missing VOYAGE_API_KEY.",
      503,
    );
  }

  const vectors: number[][] = [];

  for (let start = 0; start < inputs.length; start += MULTIMODAL_BATCH_SIZE) {
    const batch = inputs.slice(start, start + MULTIMODAL_BATCH_SIZE);
    vectors.push(...(await embedBatch(batch, apiKey)));
  }

  return vectors;
}

async function embedBatch(
  batch: MultimodalEmbedInput[],
  apiKey: string,
): Promise<number[][]> {
  const response = await fetch(VOYAGE_MULTIMODAL_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MULTIMODAL_EMBEDDING_MODEL,
      input_type: "document",
      output_dimension: CHUNK_MULTIMODAL_EMBEDDING_DIMENSIONS,
      inputs: batch.map((input) => ({
        content: [
          { type: "text", text: input.text },
          input.kind === "image"
            ? { type: "image_url", image_url: input.mediaUrl }
            : { type: "video_url", video_url: input.mediaUrl },
        ],
      })),
    }),
  });

  const responseText = await response.text();
  let json: unknown;

  try {
    json = JSON.parse(responseText);
  } catch {
    throw new APIError(
      "ERR_VOYAGE_INVALID_RESPONSE",
      `Voyage returned non-JSON response (${response.status} ${response.statusText}).`,
      502,
    );
  }

  if (!response.ok) {
    throw new APIError(
      "ERR_VOYAGE_REQUEST_FAILED",
      `Voyage request failed (${response.status} ${response.statusText}): ${JSON.stringify(json)}`,
      502,
    );
  }

  const parsed = voyageResponseSchema.parse(json);

  if (parsed.data.length !== batch.length) {
    throw new APIError(
      "ERR_VOYAGE_INVALID_RESPONSE",
      `Voyage returned ${parsed.data.length} embeddings for ${batch.length} inputs.`,
      502,
    );
  }

  // The response carries an explicit index per embedding — do not trust array order.
  const ordered = [...parsed.data].sort((a, b) => a.index - b.index);
  const wrongDimension = ordered.find(
    (item) => item.embedding.length !== CHUNK_MULTIMODAL_EMBEDDING_DIMENSIONS,
  );

  // Caught here rather than as an opaque pgvector insert failure downstream.
  if (wrongDimension) {
    throw new APIError(
      "ERR_VOYAGE_INVALID_RESPONSE",
      `Voyage returned a ${wrongDimension.embedding.length}-dimension embedding, ` +
        `expected ${CHUNK_MULTIMODAL_EMBEDDING_DIMENSIONS}.`,
      502,
    );
  }

  return ordered.map((item) => item.embedding);
}
