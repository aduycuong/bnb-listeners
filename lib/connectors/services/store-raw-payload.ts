import { eq } from "drizzle-orm";

import { collectRuns } from "@/db/schema";
import { db } from "@/lib/db";

import { getConnector } from "../registry";
import type { StoreRawPayloadParams, StoreRawPayloadResult } from "../types";
import { buildRawPayloadKey } from "../utils/build-raw-payload-key";
import { getCollectRun } from "../utils/get-collect-run";
import { isBrightDataErrorRecord } from "../utils/is-bright-data-error-record";
import { rawPayloadStorage } from "../utils/raw-payload-storage";

function readFirstError(records: unknown[]): string | null {
  const record = records.find(isBrightDataErrorRecord) as
    | Record<string, unknown>
    | undefined;
  if (!record) return null;
  return String(record.error ?? record.error_code);
}

/**
 * Archives the raw payload (L0) unchanged and records its key on the run. The
 * key is derived from the run, so a repeated delivery overwrites the same object.
 */
export async function storeRawPayload(
  params: StoreRawPayloadParams,
): Promise<StoreRawPayloadResult> {
  const run = await getCollectRun(params.collectRunId);
  const connector = getConnector(run.connector);

  const parsed: unknown = JSON.parse(params.body);
  const records = Array.isArray(parsed) ? parsed : [parsed];

  const payloadKey = buildRawPayloadKey({
    platform: connector.platform,
    connector: run.connector,
    collectRunId: run.id,
    createdAt: run.createdAt,
  });

  await rawPayloadStorage.put(payloadKey, params.body);

  const errorCount = records.filter(isBrightDataErrorRecord).length;

  await db
    .update(collectRuns)
    .set({
      payloadKey,
      itemCount: records.length,
      // Provider returned only error rows (e.g. no posts in range); keep the reason.
      ...(records.length > 0 &&
        errorCount === records.length && { error: readFirstError(records) }),
    })
    .where(eq(collectRuns.id, run.id));

  return { payloadKey, itemCount: records.length };
}
