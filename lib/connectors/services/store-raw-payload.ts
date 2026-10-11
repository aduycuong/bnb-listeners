import { eq } from "drizzle-orm";

import { collectRuns } from "@/db/schema";
import { db } from "@/lib/db";
import { putObjectToR2 } from "@/lib/r2/services/put-object-to-r2";

import { getConnector } from "../registry";
import type { StoreRawPayloadParams, StoreRawPayloadResult } from "../types";
import { buildRawR2Key } from "../utils/build-raw-r2-key";
import { getCollectRun } from "../utils/get-collect-run";
import { getRawBucket } from "../utils/get-raw-bucket";
import { isBrightDataErrorRecord } from "../utils/is-bright-data-error-record";

function readFirstError(records: unknown[]): string | null {
  const record = records.find(isBrightDataErrorRecord) as
    | Record<string, unknown>
    | undefined;
  if (!record) return null;
  return String(record.error ?? record.error_code);
}

/**
 * Archives the raw payload to R2 (L0) unchanged and records the key on the
 * run. The key is derived from the run, so the webhook and the polling
 * fallback write the same object and re-running is harmless.
 */
export async function storeRawPayload(
  params: StoreRawPayloadParams,
): Promise<StoreRawPayloadResult> {
  const run = await getCollectRun(params.collectRunId);
  const connector = getConnector(run.connector);

  const parsed: unknown = JSON.parse(params.body);
  const records = Array.isArray(parsed) ? parsed : [parsed];

  const r2Key = buildRawR2Key({
    platform: connector.platform,
    connector: run.connector,
    collectRunId: run.id,
    createdAt: run.createdAt,
  });

  await putObjectToR2({
    key: r2Key,
    body: Buffer.from(params.body, "utf8"),
    contentType: "application/json",
    bucket: getRawBucket(),
  });

  const errorCount = records.filter(isBrightDataErrorRecord).length;

  await db
    .update(collectRuns)
    .set({
      r2Key,
      itemCount: records.length,
      // Provider returned only error rows (e.g. no posts in range); keep the reason.
      ...(records.length > 0 &&
        errorCount === records.length && { error: readFirstError(records) }),
    })
    .where(eq(collectRuns.id, run.id));

  return { r2Key, itemCount: records.length };
}
