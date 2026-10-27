"use client";

import Link from "next/link";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AdminSpending, AdminSpendingProvider } from "@/lib/admin-console/types";
import { SPENDING_CONFIG } from "@/lib/spending/config";
import { cn } from "@/lib/utils";

import { AdminFilterSelect } from "./admin-filter-select";
import { formatNumber, formatUsd } from "./admin-format";
import { AdminQueryState } from "./admin-query-state";
import { adminQueryKeys } from "./admin-query-keys";
import { AdminSection } from "./admin-section";
import { AdminSpendingDailyChart, AdminSpendingMonthChart } from "./admin-spending-charts";
import { fetchAdminJson } from "./fetch-admin-json";
import { useAdminSearchParams } from "./use-admin-search-params";

const FILTER_KEYS = ["provider", "days"] as const;

function SpendingCard({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: "danger";
}) {
  return (
    <div className="rounded-xl border border-border p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-2xl font-semibold tabular-nums", tone === "danger" && "text-destructive")}>
        {value}
      </p>
      {detail ? <p className="mt-1 text-xs text-muted-foreground">{detail}</p> : null}
    </div>
  );
}

function sumCost(providers: AdminSpendingProvider[], pick: (key: AdminSpendingProvider["key"]) => number) {
  return providers.reduce((total, provider) => total + pick(provider.key), 0);
}

function SpendingSummary({ data, providers }: { data: AdminSpending; providers: AdminSpendingProvider[] }) {
  const single = providers.length === 1 ? providers[0]! : null;
  const month = data.month.byProvider;
  const toDate = sumCost(providers, (key) => month[key].cost);
  const forecast = sumCost(providers, (key) => month[key].forecastCost);
  const runRate = sumCost(providers, (key) => month[key].runRatePerDay);
  const rangeCost = data.daily
    .filter((day) => day.date >= data.rangeStart)
    .reduce((total, day) => total + sumCost(providers, (key) => day.byProvider[key].cost), 0);

  const budgets = providers.map((provider) => provider.monthlyBudget);
  const budget = budgets.every((value) => value !== null)
    ? budgets.reduce<number>((total, value) => total + value!, 0)
    : null;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <SpendingCard
        label="Month to date"
        value={formatUsd(toDate)}
        detail={
          single
            ? `${formatNumber(month[single.key].units)} ${single.unitLabel} since ${data.month.start}`
            : `Since ${data.month.start} (UTC)`
        }
      />
      <SpendingCard
        label="Forecast month end"
        value={formatUsd(forecast)}
        tone={budget !== null && forecast > budget ? "danger" : undefined}
        detail={
          budget !== null
            ? `${Math.round((forecast / budget) * 100)}% of the ${formatUsd(budget)} budget`
            : "No budget set"
        }
      />
      <SpendingCard
        label="Run rate"
        value={`${formatUsd(runRate)} / day`}
        detail={`Average of the last ${data.month.runRateDays} full days`}
      />
      <SpendingCard
        label={`Last ${data.rangeDays} days`}
        value={formatUsd(rangeCost)}
        detail={`Since ${data.rangeStart}`}
      />
    </div>
  );
}

export function AdminSpendingPage() {
  const { values, setValue } = useAdminSearchParams(FILTER_KEYS);
  const days = values.days || String(SPENDING_CONFIG.defaultRangeDays);

  const { data, isPending, error, isFetching } = useQuery({
    queryKey: adminQueryKeys.spending(days),
    queryFn: () => fetchAdminJson<AdminSpending>("/api/admin/spending", { days }),
    placeholderData: keepPreviousData,
    refetchInterval: 5 * 60_000,
  });

  const providers = data
    ? data.providers.filter((provider) => !values.provider || provider.key === values.provider)
    : [];
  const providerByKey = new Map(data?.providers.map((provider) => [provider.key, provider]));
  const showUnits = providers.length === 1;

  const byConnector = data?.byConnector.filter((row) => providers.some((p) => p.key === row.provider)) ?? [];
  const topSources = (data?.topSources.filter((row) => providers.some((p) => p.key === row.provider)) ?? []).slice(
    0,
    10,
  );

  return (
    <>
      <AdminSection
        title="Spending"
        description={
          data ? (
            <>
              Billed units × prices in{" "}
              <Link href="/admin/settings" className="underline">
                settings
              </Link>
              :{" "}
              {data.providers
                .map(
                  (provider) =>
                    `${provider.label} ${formatUsd(provider.pricePer1k)} / 1,000 ${provider.unitLabel}`,
                )
                .join(" · ")}
              . Days are UTC.
            </>
          ) : null
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <AdminFilterSelect
              label="providers"
              value={values.provider}
              options={(data?.providers ?? []).map((provider) => ({
                value: provider.key,
                label: provider.label,
              }))}
              onChange={(value) => setValue("provider", value)}
            />
            <div className="flex gap-1">
              {SPENDING_CONFIG.rangeDays.map((option) => (
                <Button
                  key={option}
                  size="sm"
                  variant={days === String(option) ? "secondary" : "ghost"}
                  onClick={() => setValue("days", option === SPENDING_CONFIG.defaultRangeDays ? "" : String(option))}
                >
                  {option}d
                </Button>
              ))}
            </div>
          </div>
        }
      >
        {data ? (
          <div className={isFetching ? "opacity-60" : undefined}>
            <SpendingSummary data={data} providers={providers} />
          </div>
        ) : (
          <AdminQueryState isPending={isPending} error={error} />
        )}
      </AdminSection>

      {data ? (
        <>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <AdminSection title="Daily cost" description={`Last ${data.rangeDays} days, by provider.`}>
              <AdminSpendingDailyChart data={data} providers={providers} />
            </AdminSection>
            <AdminSection
              title="This month"
              description="Cumulative cost; the dashed line runs the run rate to the end of the month."
            >
              <AdminSpendingMonthChart data={data} providers={providers} />
            </AdminSection>
          </div>

          <AdminSection title="By connector" description={`Last ${data.rangeDays} days.`}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Connector</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead className="text-right">Runs</TableHead>
                  <TableHead className="text-right">Units</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byConnector.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-muted-foreground">
                      No billed runs in this range.
                    </TableCell>
                  </TableRow>
                ) : (
                  byConnector.map((row) => {
                    const provider = providerByKey.get(row.provider)!;
                    return (
                      <TableRow key={row.connector}>
                        <TableCell>
                          <Link href={`/admin/collect-runs?connector=${row.connector}`} className="hover:underline">
                            {row.connector}
                          </Link>
                        </TableCell>
                        <TableCell>{provider.label}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatNumber(row.runs)}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatNumber(row.units)} {provider.unitLabel}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{formatUsd(row.cost)}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </AdminSection>

          <AdminSection title="Top sources" description={`Most expensive sources, last ${data.rangeDays} days.`}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source</TableHead>
                  {showUnits ? null : <TableHead>Provider</TableHead>}
                  <TableHead className="text-right">Runs</TableHead>
                  <TableHead className="text-right">Units</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topSources.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={showUnits ? 4 : 5} className="text-muted-foreground">
                      No billed runs in this range.
                    </TableCell>
                  </TableRow>
                ) : (
                  topSources.map((row) => {
                    const provider = providerByKey.get(row.provider)!;
                    return (
                      <TableRow key={`${row.sourceId}-${row.provider}`}>
                        <TableCell>
                          <Link href={`/admin/sources/${row.sourceId}`} className="hover:underline">
                            {row.name ?? row.sourceId}
                          </Link>
                          {row.platform ? (
                            <span className="ml-2 text-xs text-muted-foreground">{row.platform}</span>
                          ) : null}
                        </TableCell>
                        {showUnits ? null : <TableCell>{provider.label}</TableCell>}
                        <TableCell className="text-right tabular-nums">{formatNumber(row.runs)}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatNumber(row.units)} {provider.unitLabel}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{formatUsd(row.cost)}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </AdminSection>
        </>
      ) : null}
    </>
  );
}
