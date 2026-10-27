"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { AdminSpending, AdminSpendingProvider } from "@/lib/admin-console/types";

import { formatUsd } from "./admin-format";

function usdTooltip(config: ChartConfig) {
  return function UsdTooltipRow(value: unknown, name: unknown) {
    const key = String(name);
    return (
      <div className="flex w-full items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <span
            className="size-2.5 shrink-0 rounded-[2px]"
            style={{ backgroundColor: config[key]?.color }}
          />
          {config[key]?.label ?? key}
        </span>
        <span className="font-mono font-medium text-foreground tabular-nums">
          {formatUsd(Number(value))}
        </span>
      </div>
    );
  };
}

const axisProps = { tickLine: false, axisLine: false, tick: { fontSize: 11 } } as const;

/** Daily cost over the selected range, stacked by provider. */
export function AdminSpendingDailyChart({
  data,
  providers,
}: {
  data: AdminSpending;
  providers: AdminSpendingProvider[];
}) {
  const config = Object.fromEntries(
    providers.map((provider) => [provider.key, { label: provider.label, color: provider.color }]),
  ) satisfies ChartConfig;

  const rows = data.daily
    .filter((day) => day.date >= data.rangeStart)
    .map((day) => ({
      date: day.date.slice(5),
      ...Object.fromEntries(
        providers.map((provider) => [provider.key, day.byProvider[provider.key].cost]),
      ),
    }));

  return (
    <ChartContainer config={config} className="aspect-auto h-[260px] w-full">
      <BarChart data={rows} margin={{ left: 0, right: 8, top: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="date" minTickGap={24} {...axisProps} />
        <YAxis width={56} tickFormatter={(value) => formatUsd(Number(value))} {...axisProps} />
        <ChartTooltip content={<ChartTooltipContent formatter={usdTooltip(config)} />} />
        {providers.map((provider) => (
          <Bar key={provider.key} dataKey={provider.key} stackId="cost" fill={`var(--color-${provider.key})`} />
        ))}
      </BarChart>
    </ChartContainer>
  );
}

/**
 * Cumulative cost of the current month: actual to today, then a dashed line
 * to the month-end forecast, with the budget when one is set.
 */
export function AdminSpendingMonthChart({
  data,
  providers,
}: {
  data: AdminSpending;
  providers: AdminSpendingProvider[];
}) {
  const config = {
    actual: { label: "Actual", color: "var(--chart-1)" },
    forecast: { label: "Forecast", color: "var(--chart-4)" },
  } satisfies ChartConfig;

  const monthDays = data.daily.filter((day) => day.date >= data.month.start);
  const toDate = providers.reduce((sum, p) => sum + data.month.byProvider[p.key].cost, 0);
  const forecast = providers.reduce((sum, p) => sum + data.month.byProvider[p.key].forecastCost, 0);
  const budgets = providers.map((p) => p.monthlyBudget);
  const budget = budgets.every((value) => value !== null)
    ? budgets.reduce<number>((sum, value) => sum + value!, 0)
    : null;

  const rows: { date: string; actual?: number; forecast?: number }[] = [];
  let cumulative = 0;
  for (const day of monthDays) {
    cumulative += providers.reduce((sum, p) => sum + day.byProvider[p.key].cost, 0);
    rows.push({ date: day.date.slice(5), actual: cumulative });
  }

  // From today's actual, straight to the forecast on the last day of the month.
  const todayIndex = rows.length - 1;
  const remaining = data.month.daysInMonth - 1 - todayIndex;
  if (rows[todayIndex]) rows[todayIndex].forecast = toDate;
  const monthStart = new Date(`${data.month.start}T00:00:00Z`);
  for (let step = 1; step <= remaining; step++) {
    const date = new Date(monthStart.getTime() + (todayIndex + step) * 24 * 60 * 60 * 1000);
    rows.push({
      date: date.toISOString().slice(5, 10),
      forecast: toDate + ((forecast - toDate) * step) / remaining,
    });
  }

  return (
    <ChartContainer config={config} className="aspect-auto h-[260px] w-full">
      <LineChart data={rows} margin={{ left: 0, right: 8, top: 16 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="date" minTickGap={24} {...axisProps} />
        <YAxis width={56} tickFormatter={(value) => formatUsd(Number(value))} {...axisProps} />
        <ChartTooltip content={<ChartTooltipContent formatter={usdTooltip(config)} />} />
        {budget !== null ? (
          <ReferenceLine
            y={budget}
            stroke="var(--destructive)"
            strokeDasharray="3 3"
            ifOverflow="extendDomain"
            label={{ value: `Budget ${formatUsd(budget)}`, position: "insideTopLeft", fontSize: 11 }}
          />
        ) : null}
        <Line type="monotone" dataKey="actual" stroke="var(--color-actual)" strokeWidth={2} dot={false} />
        <Line
          type="monotone"
          dataKey="forecast"
          stroke="var(--color-forecast)"
          strokeWidth={2}
          strokeDasharray="5 4"
          dot={false}
        />
      </LineChart>
    </ChartContainer>
  );
}
