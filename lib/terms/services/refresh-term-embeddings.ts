import { eq, inArray } from "drizzle-orm";

import { terms } from "@/db/schema";
import { EMBEDDING_MODEL } from "@/lib/chunking/config";
import { db } from "@/lib/db";

import type {
  RefreshTermEmbeddingsParams,
  RefreshTermEmbeddingsResult,
} from "../types";
import { buildTermEmbeddingText } from "../utils/build-term-embedding-text";
import { embedTermTexts } from "../utils/embed-term-texts";

/**
 * Recomputes and stores `terms.embedding` for the given terms.
 *
 * Called after a term's name/description changes and by the backfill script.
 * Ids that no longer exist are skipped. Throws when the embedding request
 * fails — callers decide whether that should fail the surrounding operation.
 */
export async function refreshTermEmbeddings(
  params: RefreshTermEmbeddingsParams,
): Promise<RefreshTermEmbeddingsResult> {
  const termIds = [...new Set(params.termIds)];
  if (termIds.length === 0) {
    return { embedded: 0 };
  }

  const rows = await db
    .select({
      id: terms.id,
      name: terms.name,
      description: terms.description,
    })
    .from(terms)
    .where(inArray(terms.id, termIds));

  if (rows.length === 0) {
    return { embedded: 0 };
  }

  const vectors = await embedTermTexts(rows.map(buildTermEmbeddingText));

  await Promise.all(
    rows.map((row, index) =>
      db
        .update(terms)
        .set({ embedding: vectors[index], embeddingModel: EMBEDDING_MODEL })
        .where(eq(terms.id, row.id)),
    ),
  );

  return { embedded: rows.length };
}
