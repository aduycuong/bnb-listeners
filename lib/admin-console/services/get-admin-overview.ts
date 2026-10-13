import { and, count, gte, inArray, isNotNull, lte, sql, sum } from "drizzle-orm";

import { collectRuns, contentItems, itemRefreshSchedules, sources } from "@/db/schema";
import { db } from "@/lib/db";
import { getUsageMonthStart } from "@/lib/connectors/utils/get-usage-month-start";

import type { AdminOverview } from "../types";

const DAY_MS = 24 * 60 * 60 * 1000;

function toRecord(rows: { key: string; value: number }[]): Record<string, number> {
  return Object.fromEntries(rows.map((row) => [row.key, row.value]));
}

/** Counts across the raw store for the admin overview. */
export async function getAdminOverview(): Promise<AdminOverview> {
  const now = new Date();
  const dayAgo = new Date(now.getTime() - DAY_MS);
  const monthStart = getUsageMonthStart(now);

  const [
    tierRows,
    kindRows,
    originRows,
    [recentItems],
    [activeRuns],
    runRows,
    usageRows,
    [refreshTotal],
    [refreshOverdue],
  ] = await Promise.all([
    db
      .select({ key: sources.activityTier, value: count() })
      .from(sources)
      .groupBy(sources.activityTier),
    db
      .select({ key: contentItems.kind, value: count() })
      .from(contentItems)
      .groupBy(contentItems.kind),
    db
      .select({ key: contentItems.origin, value: count() })
      .from(contentItems)
      .groupBy(contentItems.origin),
    db
      .select({ value: count() })
      .from(contentItems)
      .where(gte(contentItems.firstSeenAt, dayAgo)),
    db
      .select({ value: count() })
      .from(collectRuns)
      .where(inArray(collectRuns.status, ["pending", "running"])),
    db
      .select({
        connector: collectRuns.connector,
        status: collectRuns.status,
        count: count(),
        items: sql<number>`coalesce(sum(${collectRuns.itemCount}), 0)::int`,
      })
      .from(collectRuns)
      .where(gte(collectRuns.createdAt, dayAgo))
      .groupBy(collectRuns.connector, collectRuns.status)
      .orderBy(collectRuns.connector, collectRuns.status),
    db
      .select({ key: collectRuns.connector, value: sum(collectRuns.itemCount) })
      .from(collectRuns)
      .where(and(isNotNull(collectRuns.itemCount), gte(collectRuns.createdAt, monthStart)))
      .groupBy(collectRuns.connector),
    db.select({ value: count() }).from(itemRefreshSchedules),
    db
      .select({ value: count() })
      .from(itemRefreshSchedules)
      .where(lte(itemRefreshSchedules.nextRefreshAt, now)),
  ]);

  const usageByConnector = toRecord(
    usageRows.map((row) => ({ key: row.key, value: Number(row.value ?? 0) })),
  );

  return {
    sources: {
      total: tierRows.reduce((total, row) => total + row.value, 0),
      byTier: toRecord(tierRows),
    },
    contentItems: {
      total: kindRows.reduce((total, row) => total + row.value, 0),
      byKind: toRecord(kindRows),
      byOrigin: toRecord(originRows),
      firstSeenLast24h: recentItems?.value ?? 0,
    },
    collectRuns: {
      active: activeRuns?.value ?? 0,
      last24hByConnector: runRows,
    },
    usage: {
      monthStart: monthStart.toISOString(),
      recordsThisMonth: Object.values(usageByConnector).reduce((a, b) => a + b, 0),
      byConnector: usageByConnector,
    },
    refreshSchedules: {
      total: refreshTotal?.value ?? 0,
      overdue: refreshOverdue?.value ?? 0,
    },
  };
}
