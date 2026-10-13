import { updateSourceDetails } from "@/lib/raw-store/services/update-source-details";
import { writeContentItems } from "@/lib/raw-store/services/write-content-items";

import { getConnector } from "../registry";
import type {
  NormalizeCollectRunBatchParams,
  NormalizeCollectRunBatchResult,
} from "../types";
import { getCollectRun } from "../utils/get-collect-run";
import { rawPayloadStorage } from "../utils/raw-payload-storage";

/**
 * Normalizes one slice of the archived payload into the raw store. Each slice
 * is its own workflow step; the write is idempotent, so a retried step only
 * refreshes the same rows.
 */
export async function normalizeCollectRunBatch(
  params: NormalizeCollectRunBatchParams,
): Promise<NormalizeCollectRunBatchResult> {
  const run = await getCollectRun(params.collectRunId);
  const connector = getConnector(run.connector);
  const connectorParams = connector.paramsSchema.parse(run.params);

  const parsed: unknown = JSON.parse(
    await rawPayloadStorage.get(params.payloadKey),
  );
  const records = (Array.isArray(parsed) ? parsed : [parsed]).slice(
    params.offset,
    params.offset + params.limit,
  );

  const normalized = connector.normalize(records, connectorParams);

  const written = await writeContentItems({
    platform: connector.platform,
    origin: "connector",
    items: normalized.items,
    sourceId: run.sourceId,
    collectRunId: run.id,
    onExisting: connector.onExisting,
  });

  if (run.sourceId && normalized.source) {
    await updateSourceDetails({ sourceId: run.sourceId, ...normalized.source });
  }

  return {
    inserted: written.inserted,
    updated: written.updated,
    skipped: normalized.skipped + written.skippedExisting,
  };
}
