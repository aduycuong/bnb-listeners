import { inArray, isNotNull, or } from "drizzle-orm";

import { sources } from "@/db/schema";
import { db } from "@/lib/db";

import { getUsageDayStart } from "../utils/get-usage-day-start";
import { getUsageMonthStart } from "../utils/get-usage-month-start";
import { getSourcesUsage } from "./get-sources-usage";

type GetSourceBudgetsParams = {
  now?: Date;
  /** Only these sources (still only those with a limit). */
  sourceIds?: string[];
};

type BudgetWindow = {
  limit: number;
  used: number;
};

export type SourceBudget = {
  sourceId: string;
  /** Records left in the tighter of the two windows. */
  remaining: number;
  /** Which window `remaining` comes from. */
  limitedBy: "month" | "day";
  /** Calendar month in UTC; null = no monthly limit. */
  month: BudgetWindow | null;
  /** Day in Vietnam time; null = no daily limit. */
  day: BudgetWindow | null;
};

/**
 * Budget of every source with a `monthly_record_limit` or a
 * `daily_record_limit`; others are unlimited and left out.
 */
export async function getSourceBudgets(
  params: GetSourceBudgetsParams = {},
): Promise<SourceBudget[]> {
  const now = params.now ?? new Date();

  if (params.sourceIds?.length === 0) return [];

  const limited = await db
    .select({
      id: sources.id,
      monthly: sources.monthlyRecordLimit,
      daily: sources.dailyRecordLimit,
    })
    .from(sources)
    .where(
      params.sourceIds
        ? inArray(sources.id, params.sourceIds)
        : or(isNotNull(sources.monthlyRecordLimit), isNotNull(sources.dailyRecordLimit)),
    );
  const withLimit = limited.filter((source) => source.monthly !== null || source.daily !== null);

  const [monthUsage, dayUsage] = await Promise.all([
    getSourcesUsage({
      sourceIds: withLimit.filter((source) => source.monthly !== null).map((source) => source.id),
      since: getUsageMonthStart(now),
    }),
    getSourcesUsage({
      sourceIds: withLimit.filter((source) => source.daily !== null).map((source) => source.id),
      since: getUsageDayStart(now),
    }),
  ]);

  return withLimit.map((source) => {
    const month =
      source.monthly !== null ? { limit: source.monthly, used: monthUsage.get(source.id) ?? 0 } : null;
    const day =
      source.daily !== null ? { limit: source.daily, used: dayUsage.get(source.id) ?? 0 } : null;
    const monthLeft = month ? Math.max(0, month.limit - month.used) : Infinity;
    const dayLeft = day ? Math.max(0, day.limit - day.used) : Infinity;

    return {
      sourceId: source.id,
      remaining: Math.min(monthLeft, dayLeft),
      limitedBy: dayLeft < monthLeft ? "day" : "month",
      month,
      day,
    };
  });
}
