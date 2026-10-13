import { and, count, desc, eq, gte, inArray } from "drizzle-orm";

import { collectRuns, contentItems, type Source } from "@/db/schema";
import { db } from "@/lib/db";
import { COLLECT_CONFIG } from "@/lib/connectors/config";
import type { ActivityTier, CollectRunStatus } from "@/lib/connectors/constants";
import { getSourcesMonthlyUsage } from "@/lib/connectors/services/get-sources-monthly-usage";

import type { AdminSourceRow } from "../types";
import { toIso } from "./to-iso";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** Adds item counts, posting rate, monthly usage and post-run timing to sources. */
export async function buildAdminSourceRows(rows: Source[]): Promise<AdminSourceRow[]> {
  if (rows.length === 0) return [];

  const now = new Date();
  const ids = rows.map((row) => row.id);
  const { windowDays, intervalHours } = COLLECT_CONFIG.tiers;
  const windowStart = new Date(now.getTime() - windowDays * DAY_MS);

  const [kindCounts, recentPosts, usage, lastPostRuns] = await Promise.all([
    db
      .select({ sourceId: contentItems.sourceId, kind: contentItems.kind, value: count() })
      .from(contentItems)
      .where(inArray(contentItems.sourceId, ids))
      .groupBy(contentItems.sourceId, contentItems.kind),
    db
      .select({ sourceId: contentItems.sourceId, value: count() })
      .from(contentItems)
      .where(
        and(
          inArray(contentItems.sourceId, ids),
          eq(contentItems.kind, "post"),
          gte(contentItems.publishedAt, windowStart),
        ),
      )
      .groupBy(contentItems.sourceId),
    getSourcesMonthlyUsage({ sourceIds: ids, now }),
    db
      .selectDistinctOn([collectRuns.sourceId], {
        sourceId: collectRuns.sourceId,
        id: collectRuns.id,
        status: collectRuns.status,
        createdAt: collectRuns.createdAt,
      })
      .from(collectRuns)
      .where(and(inArray(collectRuns.sourceId, ids), eq(collectRuns.connector, "facebook-posts")))
      .orderBy(collectRuns.sourceId, desc(collectRuns.createdAt)),
  ]);

  const posts = new Map<string, number>();
  const comments = new Map<string, number>();
  for (const row of kindCounts) {
    if (!row.sourceId) continue;
    const target = row.kind === "post" ? posts : comments;
    target.set(row.sourceId, (target.get(row.sourceId) ?? 0) + row.value);
  }
  const recent = new Map(recentPosts.map((row) => [row.sourceId, row.value]));
  const lastRuns = new Map(lastPostRuns.map((row) => [row.sourceId, row]));

  return rows.map((row) => {
    const tier = row.activityTier as ActivityTier;
    const lastRun = lastRuns.get(row.id);
    const nextPostRunAt =
      lastRun && tier !== "paused"
        ? new Date(lastRun.createdAt.getTime() + intervalHours[tier] * HOUR_MS)
        : null;

    return {
      id: row.id,
      platform: row.platform,
      sourceType: row.sourceType,
      name: row.name,
      url: row.url,
      activityTier: tier,
      activityTierLocked: row.activityTierLocked,
      monthlyRecordLimit: row.monthlyRecordLimit,
      origin: row.origin,
      lastCollectedAt: toIso(row.lastCollectedAt),
      posts: posts.get(row.id) ?? 0,
      comments: comments.get(row.id) ?? 0,
      postsPerDay: Math.round(((recent.get(row.id) ?? 0) / windowDays) * 10) / 10,
      usedThisMonth: usage.get(row.id) ?? 0,
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
