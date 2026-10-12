import { eq } from "drizzle-orm";

import { sources } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import { APIError } from "@/lib/exposers/api-error";
import { getSourceLatestPublishedAt } from "@/lib/raw-store/services/get-source-latest-published-at";

import type { CreateCollectRunResult } from "../types";
import { createCollectRun } from "./create-collect-run";

/** Re-request this much before the newest stored post; upserts absorb the overlap. */
const SINCE_OVERLAP_MS = 24 * 60 * 60 * 1000;

/** First collection of a source with no stored posts looks back this far. */
const INITIAL_LOOKBACK_MS = 30 * 24 * 60 * 60 * 1000;

type CollectSourceParams = {
  sourceId: string;
  /** Overrides the incremental `since` (ISO datetime). */
  since?: string;
  limit?: number;
  collectComments?: boolean;
};

/**
 * Starts an incremental collection of a source. `since` comes from the newest
 * post already in the raw store (legacy imports included), minus a day of
 * overlap, so each run only asks the provider for new posts.
 */
export async function collectSource(
  params: CollectSourceParams,
): Promise<CreateCollectRunResult & { since: string }> {
  const [source] = await db
    .select({ id: sources.id, platform: sources.platform, url: sources.url })
    .from(sources)
    .where(eq(sources.id, params.sourceId))
    .limit(1);

  if (!source) {
    throw new NotFoundError("source", params.sourceId);
  }

  if (source.platform !== "facebook" || !source.url) {
    throw new APIError(
      "ERR_SOURCE_NOT_COLLECTABLE",
      `No connector for ${source.platform} source ${source.id}.`,
      400,
    );
  }

  const since = params.since ?? (await resolveSince(source.id));

  const run = await createCollectRun({
    connector: "facebook-posts",
    sourceId: source.id,
    params: {
      url: source.url,
      since,
      ...(params.limit !== undefined && { limit: params.limit }),
      ...(params.collectComments !== undefined && {
        collectComments: params.collectComments,
      }),
    },
  });

  return { ...run, since };
}

async function resolveSince(sourceId: string): Promise<string> {
  const latest = await getSourceLatestPublishedAt({ sourceId, kind: "post" });
  const since = latest
    ? latest.getTime() - SINCE_OVERLAP_MS
    : Date.now() - INITIAL_LOOKBACK_MS;

  return new Date(since).toISOString();
}
