import { APIError } from "@/lib/exposers/api-error";

import { NORMALIZE_BATCH_SIZE } from "../constants";
import { getConnector } from "../registry";
import type { CollectRunStats, FollowUpRun } from "../types";
import { getCollectRun } from "../utils/get-collect-run";
import { rawPayloadStorage } from "../utils/raw-payload-storage";
import { createCollectRun } from "./create-collect-run";
import { finishCollectRun } from "./finish-collect-run";
import { normalizeCollectRunBatch } from "./normalize-collect-run-batch";
import { runAfterNormalize } from "./run-after-normalize";

type RenormalizeCollectRunParams = {
  collectRunId: string;
  /** Parse the payload and report counts; no writes. */
  dryRun?: boolean;
  /** Do not start the follow-up runs (e.g. comment runs) the hook plans. */
  skipFollowUps?: boolean;
};

type RenormalizeCollectRunResult = {
  connector: string;
  payloadKey: string;
  records: number;
  previousStats: Record<string, unknown> | null;
  stats: CollectRunStats;
  followUps: (FollowUpRun & { collectRunId?: string })[];
};

/**
 * Writes an archived payload into the raw store again, e.g. after a parsing
 * fix, without a new provider job. Runs the same steps as the workflow:
 * normalize batches, the connector's after-normalize hook, finish, follow-ups.
 */
export async function renormalizeCollectRun(
  params: RenormalizeCollectRunParams,
): Promise<RenormalizeCollectRunResult> {
  const run = await getCollectRun(params.collectRunId);

  if (!run.payloadKey) {
    throw new APIError(
      "ERR_COLLECT_RUN_NO_PAYLOAD",
      `Collect run ${run.id} has no archived payload.`,
      400,
    );
  }

  const parsed: unknown = JSON.parse(await rawPayloadStorage.get(run.payloadKey));
  const records = Array.isArray(parsed) ? parsed : [parsed];
  const base = {
    connector: run.connector,
    payloadKey: run.payloadKey,
    records: records.length,
    previousStats: run.stats ?? null,
  };

  if (params.dryRun) {
    const connector = getConnector(run.connector);
    const normalized = connector.normalize(records, connector.paramsSchema.parse(run.params));
    return {
      ...base,
      stats: { inserted: 0, updated: 0, skipped: normalized.skipped, parsed: normalized.items.length },
      followUps: [],
    };
  }

  const stats: CollectRunStats = { inserted: 0, updated: 0, skipped: 0 };
  for (let offset = 0; offset < records.length; offset += NORMALIZE_BATCH_SIZE) {
    const batch = await normalizeCollectRunBatch({
      collectRunId: run.id,
      payloadKey: run.payloadKey,
      offset,
      limit: NORMALIZE_BATCH_SIZE,
    });
    stats.inserted += batch.inserted;
    stats.updated += batch.updated;
    stats.skipped += batch.skipped;
  }

  const after = await runAfterNormalize({ collectRunId: run.id });
  const finalStats: CollectRunStats = {
    ...stats,
    ...after.stats,
    renormalizedAt: new Date().toISOString(),
  };
  await finishCollectRun({ collectRunId: run.id, stats: finalStats });

  const followUps: RenormalizeCollectRunResult["followUps"] = [];
  for (const followUp of after.followUps ?? []) {
    if (params.skipFollowUps) {
      followUps.push(followUp);
      continue;
    }
    const { collectRunId } = await createCollectRun(followUp);
    followUps.push({ ...followUp, collectRunId });
  }

  return { ...base, stats: finalStats, followUps };
}
