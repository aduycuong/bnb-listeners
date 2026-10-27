import { and, count, eq, gte, inArray, isNotNull, sql } from "drizzle-orm";

import { collectRuns, sources } from "@/db/schema";
import { db } from "@/lib/db";
import { getUsageMonthStart } from "@/lib/connectors/utils/get-usage-month-start";
import { getSettings } from "@/lib/settings/services/get-settings";
import {
  BILLING_UNITS,
  SPENDING_CONFIG,
  SPENDING_PROVIDER_KEYS,
  SPENDING_PROVIDERS,
  type SpendingProviderKey,
} from "@/lib/spending/config";

import type {
  AdminSpending,
  AdminSpendingAmount,
  AdminSpendingDay,
  AdminSpendingMonthProvider,
  GetAdminSpendingParams,
} from "../types";

const DAY_MS = 24 * 60 * 60 * 1000;
const TOP_SOURCES_PER_PROVIDER = 10;

type UnitSums = { records: number; requests: number };

const PROVIDER_BY_CONNECTOR = new Map<string, SpendingProviderKey>(
  SPENDING_PROVIDER_KEYS.flatMap((key) =>
    SPENDING_PROVIDERS[key].connectors.map((connector) => [connector, key] as const),
  ),
);

function toUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function formatDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function zeroAmounts(): Record<SpendingProviderKey, AdminSpendingAmount> {
  return Object.fromEntries(
    SPENDING_PROVIDER_KEYS.map((key) => [key, { units: 0, cost: 0 }]),
  ) as Record<SpendingProviderKey, AdminSpendingAmount>;
}

function addTo(target: AdminSpendingAmount, amount: AdminSpendingAmount): void {
  target.units += amount.units;
  target.cost += amount.cost;
}

/**
 * Spending on paid data providers from `collect_runs`: billed units per run
 * (records or requests, see `BILLING_UNITS`) times the current price in the
 * `spending-pricing` setting. Days are UTC calendar days of the run's
 * creation, like the monthly record limits. The month-end forecast adds the
 * average of the last full days over the rest of the month.
 */
export async function getAdminSpending(params: GetAdminSpendingParams): Promise<AdminSpending> {
  const now = new Date();
  const rangeDays = (SPENDING_CONFIG.rangeDays as readonly number[]).includes(params.days ?? 0)
    ? params.days!
    : SPENDING_CONFIG.defaultRangeDays;

  const today = toUtcDay(now);
  const rangeStart = new Date(today.getTime() - (rangeDays - 1) * DAY_MS);
  const monthStart = getUsageMonthStart(now);
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const runRateStart = new Date(today.getTime() - SPENDING_CONFIG.runRateDays * DAY_MS);
  const dailyFrom = new Date(Math.min(rangeStart.getTime(), monthStart.getTime()));
  const queryFrom = new Date(Math.min(dailyFrom.getTime(), runRateStart.getTime()));

  const billedConnectors = [...PROVIDER_BY_CONNECTOR.keys()];
  const unitSums = {
    records: sql<number>`coalesce(sum(${collectRuns.itemCount}), 0)`.mapWith(Number),
    requests: sql<number>`coalesce(sum((${collectRuns.stats} ->> 'requests')::numeric), 0)`.mapWith(
      Number,
    ),
  };
  const day = sql<string>`to_char(${collectRuns.createdAt} at time zone 'UTC', 'YYYY-MM-DD')`;

  const [{ "spending-pricing": pricing }, dayRows, sourceRows] = await Promise.all([
    getSettings(["spending-pricing"]),
    db
      .select({ day, connector: collectRuns.connector, runs: count(), ...unitSums })
      .from(collectRuns)
      .where(
        and(
          inArray(collectRuns.connector, billedConnectors),
          gte(collectRuns.createdAt, queryFrom),
        ),
      )
      .groupBy(day, collectRuns.connector),
    db
      .select({
        sourceId: collectRuns.sourceId,
        name: sources.name,
        platform: sources.platform,
        connector: collectRuns.connector,
        runs: count(),
        ...unitSums,
      })
      .from(collectRuns)
      .leftJoin(sources, eq(sources.id, collectRuns.sourceId))
      .where(
        and(
          inArray(collectRuns.connector, billedConnectors),
          isNotNull(collectRuns.sourceId),
          gte(collectRuns.createdAt, rangeStart),
        ),
      )
      .groupBy(collectRuns.sourceId, sources.name, sources.platform, collectRuns.connector),
  ]);

  function amountOf(provider: SpendingProviderKey, sums: UnitSums): AdminSpendingAmount {
    const billing = SPENDING_PROVIDERS[provider].billing;
    const units = billing === "record" ? sums.records : sums.requests;
    return { units, cost: (units / 1000) * pricing[provider].pricePer1k };
  }

  // Every day from `queryFrom` to today, so charts have no gaps.
  const days = new Map<string, AdminSpendingDay>();
  for (let time = queryFrom.getTime(); time <= today.getTime(); time += DAY_MS) {
    const date = formatDay(new Date(time));
    days.set(date, { date, byProvider: zeroAmounts() });
  }

  const rangeStartDay = formatDay(rangeStart);
  const byConnector = new Map<string, AdminSpending["byConnector"][number]>();

  for (const row of dayRows) {
    const provider = PROVIDER_BY_CONNECTOR.get(row.connector)!;
    const amount = amountOf(provider, row);
    const entry = days.get(row.day);
    if (entry) addTo(entry.byProvider[provider], amount);

    if (row.day >= rangeStartDay) {
      const total = byConnector.get(row.connector) ?? {
        connector: row.connector,
        provider,
        runs: 0,
        units: 0,
        cost: 0,
      };
      total.runs += row.runs;
      addTo(total, amount);
      byConnector.set(row.connector, total);
    }
  }

  const monthStartDay = formatDay(monthStart);
  const runRateStartDay = formatDay(runRateStart);
  const todayDay = formatDay(today);
  const remainingDays = (monthEnd.getTime() - now.getTime()) / DAY_MS;

  const month = Object.fromEntries(
    SPENDING_PROVIDER_KEYS.map((key) => {
      const toDate = { units: 0, cost: 0 };
      let runRateCost = 0;

      for (const entry of days.values()) {
        if (entry.date >= monthStartDay) addTo(toDate, entry.byProvider[key]);
        if (entry.date >= runRateStartDay && entry.date < todayDay) {
          runRateCost += entry.byProvider[key].cost;
        }
      }

      const runRatePerDay = runRateCost / SPENDING_CONFIG.runRateDays;
      const value: AdminSpendingMonthProvider = {
        ...toDate,
        runRatePerDay,
        forecastCost: toDate.cost + runRatePerDay * remainingDays,
      };
      return [key, value];
    }),
  ) as Record<SpendingProviderKey, AdminSpendingMonthProvider>;

  const bySource = new Map<string, AdminSpending["topSources"][number]>();
  for (const row of sourceRows) {
    const provider = PROVIDER_BY_CONNECTOR.get(row.connector)!;
    const id = `${row.sourceId}:${provider}`;
    const total = bySource.get(id) ?? {
      sourceId: row.sourceId!,
      name: row.name,
      platform: row.platform,
      provider,
      runs: 0,
      units: 0,
      cost: 0,
    };
    total.runs += row.runs;
    addTo(total, amountOf(provider, row));
    bySource.set(id, total);
  }

  // The top of each provider, so a provider filter on the page still has a full list.
  const topSources = SPENDING_PROVIDER_KEYS.flatMap((key) =>
    [...bySource.values()]
      .filter((row) => row.provider === key && row.cost > 0)
      .sort((a, b) => b.cost - a.cost)
      .slice(0, TOP_SOURCES_PER_PROVIDER),
  ).sort((a, b) => b.cost - a.cost);

  const dailyFromDay = formatDay(dailyFrom);

  return {
    currency: SPENDING_CONFIG.currency,
    generatedAt: now.toISOString(),
    providers: SPENDING_PROVIDER_KEYS.map((key) => {
      const provider = SPENDING_PROVIDERS[key];
      return {
        key,
        label: provider.label,
        billing: provider.billing,
        unitLabel: BILLING_UNITS[provider.billing].label,
        color: provider.color,
        pricePer1k: pricing[key].pricePer1k,
        monthlyBudget: pricing[key].monthlyBudget > 0 ? pricing[key].monthlyBudget : null,
      };
    }),
    rangeStart: rangeStartDay,
    rangeDays,
    daily: [...days.values()].filter((entry) => entry.date >= dailyFromDay),
    month: {
      start: monthStartDay,
      end: formatDay(monthEnd),
      daysInMonth: Math.round((monthEnd.getTime() - monthStart.getTime()) / DAY_MS),
      runRateDays: SPENDING_CONFIG.runRateDays,
      byProvider: month,
    },
    byConnector: [...byConnector.values()].sort((a, b) => b.cost - a.cost),
    topSources,
  };
}
