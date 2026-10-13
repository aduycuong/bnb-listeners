import { and, count, eq, gte, min } from "drizzle-orm";

import { contentItems, sources } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";

import { COLLECT_CONFIG } from "../config";
import type { ActivityTier } from "../constants";

const DAY_MS = 24 * 60 * 60 * 1000;

type RecomputeSourceActivityTierParams = {
  sourceId: string;
  now?: Date;
};

type RecomputeSourceActivityTierResult = {
  activityTier: ActivityTier;
  /** Null when the tier was kept because it is locked or paused. */
  postsPerDay: number | null;
};

/**
 * Sets `activity_tier` from posts per day over the configured window. A
 * source with less history than the window is measured over what it has
 * (at least one day), so a new busy source is `hot` from its first run.
 * Locked and paused sources are left alone.
 */
export async function recomputeSourceActivityTier(
  params: RecomputeSourceActivityTierParams,
): Promise<RecomputeSourceActivityTierResult> {
  const now = params.now ?? new Date();
  const { windowDays, minPostsPerDay } = COLLECT_CONFIG.tiers;

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
  if (source.activityTierLocked || current === "paused") {
    return { activityTier: current, postsPerDay: null };
  }

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

  const posts = row?.posts ?? 0;
  const spanDays = row?.oldest
    ? Math.max(1, (now.getTime() - row.oldest.getTime()) / DAY_MS)
    : windowDays;
  const postsPerDay = Math.round((posts / spanDays) * 10) / 10;

  const activityTier: ActivityTier =
    postsPerDay >= minPostsPerDay.hot
      ? "hot"
      : postsPerDay >= minPostsPerDay.normal
        ? "normal"
        : "low";

  if (activityTier !== current) {
    await db
      .update(sources)
      .set({ activityTier })
      .where(eq(sources.id, params.sourceId));
  }

  return { activityTier, postsPerDay };
}
