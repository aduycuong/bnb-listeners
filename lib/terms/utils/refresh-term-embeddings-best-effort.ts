import { refreshTermEmbeddings } from "../services/refresh-term-embeddings";

/**
 * Refreshes term embeddings without letting a failed embedding request fail
 * the surrounding admin action. Terms left without an embedding are skipped by
 * candidate matching until `npm run terms:embed` backfills them.
 */
export async function refreshTermEmbeddingsBestEffort(
  termIds: string[],
): Promise<void> {
  try {
    await refreshTermEmbeddings({ termIds });
  } catch (error) {
    console.error("[terms] Failed to refresh term embeddings", {
      termIds,
      error: error instanceof Error ? error.message : error,
    });
  }
}
