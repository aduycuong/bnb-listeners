import { eq } from "drizzle-orm";

import { sources } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import { APIError } from "@/lib/exposers/api-error";
import { getSourceLatestPublishedAt } from "@/lib/raw-store/services/get-source-latest-published-at";

import { COLLECT_CONFIG } from "../config";
import type { CreateCollectRunResult } from "../types";
import { createCollectRun } from "./create-collect-run";

const HOUR_MS = 60 * 60 * 1000;

type CollectSourceParams = {
  sourceId: string;
  /** Overrides the incremental `since` (ISO datetime). */
  since?: string;
  limit?: number;
  collectComments?: boolean;
};

/**
 * Starts an incremental collection of a source. `since` comes from the newest
 * post already in the raw store (legacy imports included), minus a short
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
    ? latest.getTime() - COLLECT_CONFIG.posts.sinceOverlapHours * HOUR_MS
    : Date.now() - COLLECT_CONFIG.posts.initialLookbackHours * HOUR_MS;

  return new Date(since).toISOString();
}
