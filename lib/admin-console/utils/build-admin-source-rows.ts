import { and, count, desc, eq, gte, inArray, min } from "drizzle-orm";

import { collectRuns, contentItems, type Source } from "@/db/schema";
import { db } from "@/lib/db";
import {
  type ActivityTier,
  type CollectRunStatus,
  POST_CONNECTOR_KEYS,
} from "@/lib/connectors/constants";
import { getSourcesUsage } from "@/lib/connectors/services/get-sources-usage";
import type { CollectSettings } from "@/lib/connectors/settings";
import { decideActivityTier } from "@/lib/connectors/utils/decide-activity-tier";
import { getPostsPerDay } from "@/lib/connectors/utils/get-posts-per-day";
import { getSourceIntervalHours } from "@/lib/connectors/utils/get-source-interval-hours";
import { getUsageDayStart } from "@/lib/connectors/utils/get-usage-day-start";
import { getUsageMonthStart } from "@/lib/connectors/utils/get-usage-month-start";

import type { AdminSourceRow } from "../types";
import { toIso } from "./to-iso";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/**
 * Adds item counts, posting rate, monthly usage and post-run timing to
 * sources. Posts per day and the automatic tier are measured as
 * `recomputeSourceActivityTier` does.
 */
export async function buildAdminSourceRows(
  rows: Source[],
  settings: CollectSettings,
): Promise<AdminSourceRow[]> {
  if (rows.length === 0) return [];

  const now = new Date();
  const ids = rows.map((row) => row.id);
  const { windowDays, minPostsPerDay } = settings.tiers;
  const windowStart = new Date(now.getTime() - windowDays * DAY_MS);

  const [kindCounts, recentPosts, usage, usageToday, lastPostRuns] = await Promise.all([
    db
      .select({ sourceId: contentItems.sourceId, kind: contentItems.kind, value: count() })
      .from(contentItems)
      .where(inArray(contentItems.sourceId, ids))
      .groupBy(contentItems.sourceId, contentItems.kind),
    db
      .select({
        sourceId: contentItems.sourceId,
        value: count(),
        oldest: min(contentItems.publishedAt),
      })
      .from(contentItems)
      .where(
        and(
          inArray(contentItems.sourceId, ids),
          eq(contentItems.kind, "post"),
          gte(contentItems.publishedAt, windowStart),
        ),
      )
      .groupBy(contentItems.sourceId),
    getSourcesUsage({ sourceIds: ids, since: getUsageMonthStart(now) }),
    getSourcesUsage({ sourceIds: ids, since: getUsageDayStart(now) }),
    db
      .selectDistinctOn([collectRuns.sourceId], {
        sourceId: collectRuns.sourceId,
        id: collectRuns.id,
        status: collectRuns.status,
        createdAt: collectRuns.createdAt,
      })
      .from(collectRuns)
      .where(
        and(
          inArray(collectRuns.sourceId, ids),
          inArray(collectRuns.connector, [...POST_CONNECTOR_KEYS]),
        ),
      )
      .orderBy(collectRuns.sourceId, desc(collectRuns.createdAt)),
  ]);

  const posts = new Map<string, number>();
  const comments = new Map<string, number>();
  for (const row of kindCounts) {
    if (!row.sourceId) continue;
    const target = row.kind === "post" ? posts : comments;
    target.set(row.sourceId, (target.get(row.sourceId) ?? 0) + row.value);
  }
  const recent = new Map(recentPosts.map((row) => [row.sourceId, row]));
  const lastRuns = new Map(lastPostRuns.map((row) => [row.sourceId, row]));

  return rows.map((row) => {
    const tier = row.activityTier as ActivityTier;
    const lastRun = lastRuns.get(row.id);
    const intervalHours = getSourceIntervalHours(row, settings);
    const isSearch = row.platform === "tiktok" && row.sourceType === "search";
    const windowPosts = recent.get(row.id);
    const postsPerDay = getPostsPerDay({
      posts: windowPosts?.value ?? 0,
      oldestPublishedAt: windowPosts?.oldest ?? null,
      windowDays,
      now,
    });
    const nextPostRunAt =
      lastRun && intervalHours !== null
        ? new Date(lastRun.createdAt.getTime() + intervalHours * HOUR_MS)
        : null;

    return {
      id: row.id,
      platform: row.platform,
      sourceType: row.sourceType,
      name: row.name,
      url: row.url,
      activityTier: tier,
      activityTierLocked: row.activityTierLocked,
      tierMode: row.activityTierLocked || tier === "paused" ? "manual" : "auto",
      autoTier: isSearch ? null : decideActivityTier(postsPerDay, minPostsPerDay),
      intervalRule: isSearch ? "search" : "tier",
      intervalHours,
      monthlyRecordLimit: row.monthlyRecordLimit,
      dailyRecordLimit: row.dailyRecordLimit,
      origin: row.origin,
      lastCollectedAt: toIso(row.lastCollectedAt),
      posts: posts.get(row.id) ?? 0,
      comments: comments.get(row.id) ?? 0,
      postsPerDay,
      usedThisMonth: usage.get(row.id) ?? 0,
      usedToday: usageToday.get(row.id) ?? 0,
      lastPostRun: lastRun
        ? {
            id: lastRun.id,
            status: lastRun.status as CollectRunStatus,
            createdAt: lastRun.createdAt.toISOString(),
          }
        : null,
      nextPostRunAt: toIso(nextPostRunAt),
    };
  });
}
