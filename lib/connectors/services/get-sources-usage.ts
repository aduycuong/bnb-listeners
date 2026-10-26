import { and, gte, inArray, isNotNull, sum } from "drizzle-orm";

import { collectRuns } from "@/db/schema";
import { db } from "@/lib/db";

type GetSourcesUsageParams = {
  sourceIds: string[];
  /** Runs created at or after this count; see `getUsageMonthStart` / `getUsageDayStart`. */
  since: Date;
};

/**
 * Records delivered per source since a time: the sum of
 * `collect_runs.item_count` over every connector (posts, refreshes,
 * comments). Bright Data bills per delivered record, so this is the spend.
 */
export async function getSourcesUsage(
  params: GetSourcesUsageParams,
): Promise<Map<string, number>> {
  if (params.sourceIds.length === 0) return new Map();

  const rows = await db
    .select({ sourceId: collectRuns.sourceId, used: sum(collectRuns.itemCount) })
    .from(collectRuns)
    .where(
      and(
        inArray(collectRuns.sourceId, params.sourceIds),
        isNotNull(collectRuns.itemCount),
        gte(collectRuns.createdAt, params.since),
      ),
    )
    .groupBy(collectRuns.sourceId);

  return new Map(rows.map((row) => [row.sourceId!, Number(row.used ?? 0)]));
}
