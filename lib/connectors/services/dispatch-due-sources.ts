import { and, eq, inArray, max, ne } from "drizzle-orm";

import { collectRuns, sources } from "@/db/schema";
import { db } from "@/lib/db";

import { COLLECT_CONFIG } from "../config";
import { type ActivityTier, POST_CONNECTOR_KEYS } from "../constants";
import type { CollectSettings } from "../settings";
import { getPostConnectorKey } from "../utils/get-post-connector-key";
import { getSourceIntervalHours } from "../utils/get-source-interval-hours";
import { collectSource } from "./collect-source";
import { getCollectSettings } from "./get-collect-settings";
import type { SourceBudget } from "./get-source-budgets";

const HOUR_MS = 60 * 60 * 1000;

type DispatchDueSourcesParams = {
  /** From `getSourceBudgets`; sources missing here are unlimited. */
  budgets: SourceBudget[];
  now?: Date;
  /** Report what would happen; no runs started. */
  dryRun?: boolean;
  /** Loaded when missing. */
  settings?: CollectSettings;
};

export type DueSourceDecision = {
  sourceId: string;
  activityTier: ActivityTier;
  lastRunAt: string;
  intervalHours: number;
  /** `due` starts a run; anything else says why not. */
  status: "due" | "not-due" | "running" | "no-budget";
  maxRecords?: number;
  collectRunId?: string;
};

/**
 * Starts post runs for sources whose interval has passed since their last
 * post run: the tier interval of a Facebook group or TikTok channel, or the
 * fixed interval of a TikTok keyword search. Only sources collected at least
 * once are scheduled (the first run is started by hand with
 * `npm run collect:facebook` or `npm run collect:tiktok`); `paused` sources
 * are skipped. A source with a run still pending or running, or with no
 * budget left, waits. The post run is capped by the remaining budget.
 */
export async function dispatchDueSources(
  params: DispatchDueSourcesParams,
): Promise<DueSourceDecision[]> {
  const now = params.now ?? new Date();
  const budgets = new Map(params.budgets.map((budget) => [budget.sourceId, budget]));

  const rows = await db
    .select({
      id: sources.id,
      platform: sources.platform,
      sourceType: sources.sourceType,
      url: sources.url,
      activityTier: sources.activityTier,
      lastRunAt: max(collectRuns.createdAt),
    })
    .from(sources)
    .innerJoin(
      collectRuns,
      and(
        eq(collectRuns.sourceId, sources.id),
        inArray(collectRuns.connector, [...POST_CONNECTOR_KEYS]),
      ),
    )
    .where(and(ne(sources.activityTier, "paused"), ne(sources.origin, "synthetic")))
    .groupBy(
      sources.id,
      sources.platform,
      sources.sourceType,
      sources.url,
      sources.activityTier,
    );

  // A keyword search has no URL; every other source needs one to be read.
  const candidates = rows.filter((source) => {
    const connector = getPostConnectorKey(source);
    return connector !== null && (connector === "tiktok-search" || source.url !== null);
  });

  if (candidates.length === 0) return [];
  const settings = params.settings ?? (await getCollectSettings());

  const active = await db
    .selectDistinct({ sourceId: collectRuns.sourceId })
    .from(collectRuns)
    .where(
      and(
        inArray(collectRuns.connector, [...POST_CONNECTOR_KEYS]),
        inArray(collectRuns.status, ["pending", "running"]),
        inArray(
          collectRuns.sourceId,
          candidates.map((source) => source.id),
        ),
      ),
    );
  const activeIds = new Set(active.map((row) => row.sourceId));

  const decisions: DueSourceDecision[] = [];

  for (const source of candidates) {
    const tier = source.activityTier as Exclude<ActivityTier, "paused">;
    const intervalHours = getSourceIntervalHours(source, settings)!;
    const budget = budgets.get(source.id);
    const base = {
      sourceId: source.id,
      activityTier: tier,
      lastRunAt: source.lastRunAt!.toISOString(),
      intervalHours,
    };

    if (source.lastRunAt!.getTime() + intervalHours * HOUR_MS > now.getTime()) {
      decisions.push({ ...base, status: "not-due" });
      continue;
    }
    if (activeIds.has(source.id)) {
      decisions.push({ ...base, status: "running" });
      continue;
    }
    if (budget && budget.remaining <= 0) {
      decisions.push({ ...base, status: "no-budget" });
      continue;
    }

    const maxRecords = Math.min(
      COLLECT_CONFIG.posts.maxRecordsPerRun,
      budget?.remaining ?? Infinity,
    );

    if (params.dryRun) {
      decisions.push({ ...base, status: "due", maxRecords });
      continue;
    }

    const { collectRunId } = await collectSource({ sourceId: source.id, maxRecords });
    decisions.push({ ...base, status: "due", maxRecords, collectRunId });
  }

  return decisions;
}
