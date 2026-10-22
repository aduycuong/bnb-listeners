import { eq } from "drizzle-orm";

import { sources } from "@/db/schema";
import { db } from "@/lib/db";

import type { BackfillSourceParams, BackfillSourceResult } from "../types";
import { buildPostRunParams } from "../utils/build-post-run-params";
import { createCollectRun } from "./create-collect-run";
import { planBackfillSource } from "./plan-backfill-source";

/** Seconds between TikTok runs, so the windows do not hit TikHub at once. */
const RUN_STAGGER_SECONDS = 20;

/**
 * Fills a gap of a source: one collect run per window, newest first, through
 * the usual `collect-source` workflow. The runs carry `backfill: true`, do not
 * count late arrivals and leave the incremental `since` alone. Posts already
 * stored are skipped, so a repeated backfill adds nothing twice.
 */
export async function backfillSource(
  params: BackfillSourceParams,
): Promise<BackfillSourceResult> {
  const plan = await planBackfillSource(params);

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
    .where(eq(sources.id, plan.sourceId))
    .limit(1);

  const runs: BackfillSourceResult["runs"] = [];

  for (const [index, window] of plan.windows.entries()) {
    const since = window.since.toISOString();
    const until = window.until.toISOString();
    const run = buildPostRunParams(source, {
      since,
      until,
      maxRecords: params.maxRecords,
    });

    const created = await createCollectRun({
      connector: run.connector,
      sourceId: source.id,
      params: run.params,
      delaySeconds: plan.connector === "tiktok-posts" ? index * RUN_STAGGER_SECONDS : undefined,
    });
    runs.push({ ...created, since, until });
  }

  return { ...plan, runs };
}
