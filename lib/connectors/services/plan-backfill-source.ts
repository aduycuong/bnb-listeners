import { eq, or } from "drizzle-orm";
import { z } from "zod";

import { sources } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import { APIError } from "@/lib/exposers/api-error";
import { countSourceItemsInRange } from "@/lib/raw-store/services/count-source-items-in-range";
import { getSourceEarliestPublishedAt } from "@/lib/raw-store/services/get-source-earliest-published-at";

import { COLLECT_CONFIG } from "../config";
import type { BackfillPlan, BackfillSourceParams } from "../types";
import { getPostConnectorKey } from "../utils/get-post-connector-key";
import { splitBackfillWindows } from "../utils/split-backfill-windows";

const HOUR_MS = 60 * 60 * 1000;

/**
 * Works out what a backfill would ask the provider for, without calling it:
 * the range, its runs and how many posts the store already has there. TikTok
 * is split into short runs because a run has a time budget; a Facebook job
 * has none, so it takes the whole range.
 */
export async function planBackfillSource(
  params: BackfillSourceParams,
): Promise<BackfillPlan> {
  const [source] = await db
    .select({
      id: sources.id,
      platform: sources.platform,
      sourceType: sources.sourceType,
      url: sources.url,
    })
    .from(sources)
    .where(
      or(
        z.uuid().safeParse(params.source).success
          ? eq(sources.id, params.source)
          : undefined,
        eq(sources.url, params.source),
      ),
    )
    .limit(1);

  if (!source) throw new NotFoundError("source", params.source);

  const connector = getPostConnectorKey(source);
  if (connector !== "facebook-posts" && connector !== "tiktok-posts") {
    throw new APIError(
      "ERR_SOURCE_NOT_BACKFILLABLE",
      `Only Facebook sources and TikTok channels can be backfilled (${source.platform} ${source.sourceType} source ${source.id}).`,
      400,
    );
  }

  const from = new Date(params.from);
  const earliest = params.to
    ? null
    : await getSourceEarliestPublishedAt({ sourceId: source.id, kind: "post" });
  const to = params.to
    ? new Date(params.to)
    : earliest
      ? new Date(earliest.getTime() + COLLECT_CONFIG.posts.sinceOverlapHours * HOUR_MS)
      : new Date();

  if (from.getTime() >= to.getTime()) {
    throw new APIError(
      "ERR_BACKFILL_RANGE",
      `Empty range: from ${from.toISOString()} is not before to ${to.toISOString()}.`,
      400,
    );
  }

  const windows =
    connector === "tiktok-posts"
      ? splitBackfillWindows(
          from,
          to,
          params.windowDays ?? COLLECT_CONFIG.tiktok.channel.backfillDaysPerRun,
        )
      : [{ since: from, until: to }];

  const existingPosts = await countSourceItemsInRange({
    sourceId: source.id,
    kind: "post",
    from,
    to,
  });

  return {
    sourceId: source.id,
    platform: source.platform,
    url: source.url,
    connector,
    from,
    to,
    toFromStoredPosts: !params.to && earliest !== null,
    windows,
    existingPosts,
  };
}
