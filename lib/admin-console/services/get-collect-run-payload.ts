import { eq } from "drizzle-orm";

import { collectRuns } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import { rawPayloadStorage } from "@/lib/connectors/utils/raw-payload-storage";

import type { CollectRunPayload, GetCollectRunPayloadParams } from "../types";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 200;

/**
 * Reads a run's raw payload (L0) and returns a slice of its records, so large
 * payloads are browsed a page at a time.
 */
export async function getCollectRunPayload(
  params: GetCollectRunPayloadParams,
): Promise<CollectRunPayload> {
  const [run] = await db
    .select({ payloadKey: collectRuns.payloadKey })
    .from(collectRuns)
    .where(eq(collectRuns.id, params.id))
    .limit(1);

  if (!run) {
    throw new NotFoundError("collect run", params.id);
  }
  if (!run.payloadKey) {
    throw new NotFoundError("raw payload of collect run", params.id);
  }

  const body = await rawPayloadStorage.get(run.payloadKey);
  const parsed: unknown = JSON.parse(body);
  const records = Array.isArray(parsed) ? parsed : [parsed];

  const offset = Math.max(0, Math.floor(params.offset ?? 0));
  const limit = Math.min(MAX_LIMIT, Math.max(1, Math.floor(params.limit ?? DEFAULT_LIMIT)));

  return {
    payloadKey: run.payloadKey,
    sizeBytes: Buffer.byteLength(body, "utf8"),
    total: records.length,
    offset,
    records: records.slice(offset, offset + limit),
  };
}
