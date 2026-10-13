import { isNotNull } from "drizzle-orm";

import { sources } from "@/db/schema";
import { db } from "@/lib/db";

import { getSourcesMonthlyUsage } from "./get-sources-monthly-usage";

type GetSourceBudgetsParams = {
  now?: Date;
};

export type SourceBudget = {
  sourceId: string;
  limit: number;
  used: number;
  remaining: number;
};

/** Monthly budget of every source with a `monthly_record_limit`; others are unlimited. */
export async function getSourceBudgets(
  params: GetSourceBudgetsParams = {},
): Promise<SourceBudget[]> {
  const limited = await db
    .select({ id: sources.id, limit: sources.monthlyRecordLimit })
    .from(sources)
    .where(isNotNull(sources.monthlyRecordLimit));

  const usage = await getSourcesMonthlyUsage({
    sourceIds: limited.map((source) => source.id),
    now: params.now,
  });

  return limited.map((source) => {
    const used = usage.get(source.id) ?? 0;
    return {
      sourceId: source.id,
      limit: source.limit!,
      used,
      remaining: Math.max(0, source.limit! - used),
    };
  });
}
