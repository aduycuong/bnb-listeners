import { eq } from "drizzle-orm";

import { sources } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import { getSourceLatestPublishedAt } from "@/lib/raw-store/services/get-source-latest-published-at";

import { COLLECT_CONFIG } from "../config";
import type { CreateCollectRunResult } from "../types";
import { buildPostRunParams } from "../utils/build-post-run-params";
import { getPostConnectorKey } from "../utils/get-post-connector-key";
import { createCollectRun } from "./create-collect-run";

const HOUR_MS = 60 * 60 * 1000;

type CollectSourceParams = {
  sourceId: string;
  /** Overrides the incremental `since` (ISO datetime). */
  since?: string;
  /** Hard cap on delivered records; defaults to the connector's safety cap. */
  maxRecords?: number;
};

/**
 * Starts an incremental collection of a source with the connector of its
 * platform. `since` comes from the newest post already in the raw store
 * (legacy imports included), minus a short overlap, so each run only asks the
 * provider for new posts. A TikTok keyword search has no `since`: it reads a
 * fixed publish-time window and `since` comes back null.
 */
export async function collectSource(
  params: CollectSourceParams,
): Promise<CreateCollectRunResult & { since: string | null }> {
  const [source] = await db
    .select({
      id: sources.id,
      platform: sources.platform,
      sourceType: sources.sourceType,
      externalId: sources.externalId,
      url: sources.url,
      metadata: sources.metadata,
    })
    .from(sources)
    .where(eq(sources.id, params.sourceId))
    .limit(1);

  if (!source) {
    throw new NotFoundError("source", params.sourceId);
  }

  const connector = getPostConnectorKey(source);
  const usesWindow = connector !== "tiktok-search";

  const latest = usesWindow
    ? await getSourceLatestPublishedAt({ sourceId: source.id, kind: "post" })
    : null;
  const since = usesWindow ? (params.since ?? resolveSince(latest)) : null;

  const run = buildPostRunParams(source, {
    since: since ?? undefined,
    // Late arrivals only mean something for an incremental run.
    newestKnownAt: !params.since && latest ? latest.toISOString() : undefined,
    maxRecords: params.maxRecords,
  });

  const created = await createCollectRun({
    connector: run.connector,
    sourceId: source.id,
    params: run.params,
  });

  return { ...created, since };
}

function resolveSince(latest: Date | null): string {
  const since = latest
    ? latest.getTime() - COLLECT_CONFIG.posts.sinceOverlapHours * HOUR_MS
    : Date.now() - COLLECT_CONFIG.posts.initialLookbackHours * HOUR_MS;

  return new Date(since).toISOString();
}
