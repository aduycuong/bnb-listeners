import { and, count, eq, gte, min } from "drizzle-orm";

import { contentItems, sources } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";

import type { ActivityTier } from "../constants";
import type { CollectSettings } from "../settings";
import { decideActivityTier } from "../utils/decide-activity-tier";
import { getPostsPerDay } from "../utils/get-posts-per-day";
import { getCollectSettings } from "./get-collect-settings";

const DAY_MS = 24 * 60 * 60 * 1000;

type RecomputeSourceActivityTierParams = {
  sourceId: string;
  now?: Date;
  /** Loaded when missing. */
  settings?: CollectSettings;
  /** Recompute even a manual or paused source (when switching it to automatic). */
  force?: boolean;
};

type RecomputeSourceActivityTierResult = {
  activityTier: ActivityTier;
  /** Null when the tier was kept because it is manual or paused. */
  postsPerDay: number | null;
};

/**
 * Sets `activity_tier` from posts per day over the configured window (see
 * `getPostsPerDay`), so a new busy source is `hot` from its first run.
 * Manual (`activity_tier_locked`) and paused sources are left alone unless
 * `force` is set.
 */
export async function recomputeSourceActivityTier(
  params: RecomputeSourceActivityTierParams,
): Promise<RecomputeSourceActivityTierResult> {
  const now = params.now ?? new Date();

  const [source] = await db
    .select({
      activityTier: sources.activityTier,
      activityTierLocked: sources.activityTierLocked,
    })
    .from(sources)
    .where(eq(sources.id, params.sourceId))
    .limit(1);

  if (!source) {
    throw new NotFoundError("source", params.sourceId);
  }

  const current = source.activityTier as ActivityTier;
  if (!params.force && (source.activityTierLocked || current === "paused")) {
    return { activityTier: current, postsPerDay: null };
  }

  const { windowDays, minPostsPerDay } = (params.settings ?? (await getCollectSettings())).tiers;
  const windowStart = new Date(now.getTime() - windowDays * DAY_MS);
  const [row] = await db
    .select({ posts: count(), oldest: min(contentItems.publishedAt) })
    .from(contentItems)
    .where(
      and(
        eq(contentItems.sourceId, params.sourceId),
        eq(contentItems.kind, "post"),
        gte(contentItems.publishedAt, windowStart),
      ),
    );

  const postsPerDay = getPostsPerDay({
    posts: row?.posts ?? 0,
    oldestPublishedAt: row?.oldest ?? null,
    windowDays,
    now,
  });
  const activityTier = decideActivityTier(postsPerDay, minPostsPerDay);

  if (activityTier !== current) {
    await db
      .update(sources)
      .set({ activityTier })
      .where(eq(sources.id, params.sourceId));
  }

  return { activityTier, postsPerDay };
}
