import { and, gte, inArray, isNotNull, sum } from "drizzle-orm";

import { collectRuns } from "@/db/schema";
import { db } from "@/lib/db";

import { getUsageMonthStart } from "../utils/get-usage-month-start";

type GetSourcesMonthlyUsageParams = {
  sourceIds: string[];
  now?: Date;
};

/**
 * Records delivered this month per source: the sum of `collect_runs.item_count`
 * over every connector (posts, refreshes, comments). Bright Data bills per
 * delivered record, so this is the spend.
 */
export async function getSourcesMonthlyUsage(
  params: GetSourcesMonthlyUsageParams,
): Promise<Map<string, number>> {
  if (params.sourceIds.length === 0) return new Map();

  const rows = await db
    .select({ sourceId: collectRuns.sourceId, used: sum(collectRuns.itemCount) })
    .from(collectRuns)
    .where(
      and(
        inArray(collectRuns.sourceId, params.sourceIds),
        isNotNull(collectRuns.itemCount),
        gte(collectRuns.createdAt, getUsageMonthStart(params.now ?? new Date())),
      ),
    )
    .groupBy(collectRuns.sourceId);

  return new Map(rows.map((row) => [row.sourceId!, Number(row.used ?? 0)]));
}
