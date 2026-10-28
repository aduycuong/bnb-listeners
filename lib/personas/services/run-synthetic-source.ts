import { and, desc, eq, inArray } from "drizzle-orm";

import { collectRuns, sources } from "@/db/schema";
import { InvalidInputError, NotFoundError } from "@/lib/common/service-errors";
import { createCollectRun } from "@/lib/connectors/services/create-collect-run";
import { db } from "@/lib/db";

import { SYNTHETIC_CONFIG } from "../config";
import type { RunSyntheticSourceResult } from "../types";
import { readSyntheticSourceConfig } from "../utils/read-synthetic-source-config";

const HOUR_MS = 60 * 60 * 1000;

type RunSyntheticSourceParams = {
  id: string;
  /** From the cron: a disabled or paused source is skipped instead of refused. */
  scheduled?: boolean;
};

/**
 * Starts one `synthetic-threads` run of a scheduled synthetic source from its
 * config. Posts are spread from the previous run to now (capped), so the
 * source fills in like a live group. A source with a run still pending or
 * running is skipped; the next tick catches up.
 */
export async function runSyntheticSource(
  params: RunSyntheticSourceParams,
): Promise<RunSyntheticSourceResult> {
  const [source] = await db
    .select({
      id: sources.id,
      origin: sources.origin,
      activityTier: sources.activityTier,
      metadata: sources.metadata,
    })
    .from(sources)
    .where(eq(sources.id, params.id))
    .limit(1);

  if (!source) {
    throw new NotFoundError("source", params.id);
  }
  const config = source.origin === "synthetic" ? readSyntheticSourceConfig(source.metadata) : null;
  if (!config) {
    throw new InvalidInputError("This source has no synthetic schedule config.");
  }
  if (params.scheduled && (!config.enabled || source.activityTier === "paused")) {
    return { collectRunId: null, skipped: "disabled" };
  }

  const [active] = await db
    .select({ id: collectRuns.id })
    .from(collectRuns)
    .where(
      and(
        eq(collectRuns.sourceId, source.id),
        inArray(collectRuns.status, ["pending", "running"]),
      ),
    )
    .limit(1);
  if (active) {
    return { collectRunId: null, skipped: "running" };
  }

  const [lastRun] = await db
    .select({ createdAt: collectRuns.createdAt })
    .from(collectRuns)
    .where(
      and(eq(collectRuns.sourceId, source.id), eq(collectRuns.connector, "synthetic-threads")),
    )
    .orderBy(desc(collectRuns.createdAt))
    .limit(1);

  const { firstWindowHours, maxWindowHours } = SYNTHETIC_CONFIG.schedule;
  const now = Date.now();
  const from = Math.max(
    lastRun?.createdAt.getTime() ?? now - firstWindowHours * HOUR_MS,
    now - maxWindowHours * HOUR_MS,
  );

  const run = await createCollectRun({
    connector: "synthetic-threads",
    sourceId: source.id,
    params: {
      panelId: config.panelId,
      topicGuide: config.topicGuide,
      briefCount: config.briefsPerRun,
      postCount: config.postsPerRun,
      commentsPerPost: config.commentsPerPost,
      window: { from: new Date(from).toISOString(), to: new Date(now).toISOString() },
    },
  });

  return { collectRunId: run.collectRunId, skipped: null };
}
