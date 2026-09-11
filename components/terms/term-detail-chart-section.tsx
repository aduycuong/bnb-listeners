"use client";

import { ChevronDownIcon } from "lucide-react";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { TermCustomPeriodDialog } from "@/components/terms/term-custom-period-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  TERM_DETAIL_CHART_METRIC_LABELS,
  TOPIC_DETAIL_CHART_METRICS,
  TOPIC_DETAIL_CHART_PERIOD_LABELS,
  TOPIC_DETAIL_CHART_PERIOD_PRESETS,
  type TermDetailChartMetric,
  type TermDetailChartPeriodPreset,
} from "@/lib/terms/term-detail-chart-config";
import type { GetTermChartResult } from "@/lib/terms/types";

const ROLLING_PERIODS: TermDetailChartPeriodPreset[] = [
  "last_7_days",
  "last_30_days",
  "last_90_days",
  "last_12_months",
];

const CALENDAR_PERIODS: TermDetailChartPeriodPreset[] = [
  "this_week",
  "last_week",
  "this_month",
  "last_month",
  "this_year",
  "last_year",
];

const chartConfig = {
  value: {
    label: "Value",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

type TermDetailChartSectionProps = {
  period: TermDetailChartPeriodPreset;
  metric: TermDetailChartMetric;
  customStartDate?: string;
  customEndDate?: string;
  chart?: GetTermChartResult;
  isLoading?: boolean;
  errorMessage?: string;
  onPeriodChange: (period: TermDetailChartPeriodPreset) => void;
  onMetricChange: (metric: TermDetailChartMetric) => void;
  onCustomRangeApply: (range: { startDate: string; endDate: string }) => void;
};

function formatScore(value: number | null) {
  if (value === null) {
    return "—";
  }

  return value.toFixed(1);
}

function formatMetricValue(metric: TermDetailChartMetric, value: number | null) {
  if (value === null) {
    return "—";
  }

  if (metric === "doc_count") {
    return value.toLocaleString();
  }

  return value.toFixed(1);
}

function getPeriodLabel(
  period: TermDetailChartPeriodPreset,
  customStartDate?: string,
  customEndDate?: string,
) {
  if (period === "custom" && customStartDate && customEndDate) {
    return `${customStartDate} – ${customEndDate}`;
  }

  return TOPIC_DETAIL_CHART_PERIOD_LABELS[period];
}

export function TermDetailChartSection({
  period,
  metric,
  customStartDate,
  customEndDate,
  chart,
  isLoading = false,
  errorMessage,
  onPeriodChange,
  onMetricChange,
  onCustomRangeApply,
}: TermDetailChartSectionProps) {
  const [customOpen, setCustomOpen] = useState(false);
  const digest = chart?.digest;
  const chartData =
    chart?.points.map((point) => ({
      label: point.label,
      value: point.value ?? 0,
    })) ?? [];

  return (
    <>
      <Card className="h-full">
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                Activity
                {digest?.isStale ? (
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <span
                          className="relative flex size-3 shrink-0 items-center justify-center"
                          aria-label="Updating metrics"
                        />
                      }
                    >
                      <span className="absolute size-2 animate-ping rounded-full bg-sky-400 opacity-75" />
                      <span className="relative size-2 rounded-full bg-sky-500" />
                    </TooltipTrigger>
                    <TooltipContent>Updating metrics</TooltipContent>
                  </Tooltip>
                ) : null}
              </CardTitle>
              {chart ? (
                <p className="text-xs text-muted-foreground">
                  {chart.period.startDate} – {chart.period.endDate}
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="min-w-36 justify-between"
                      disabled={isLoading}
                    />
                  }
                >
                  {getPeriodLabel(period, customStartDate, customEndDate)}
                  <ChevronDownIcon className="size-4 text-muted-foreground" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-48">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>Rolling</DropdownMenuLabel>
                    <DropdownMenuRadioGroup
                      value={period}
                      onValueChange={(value) => {
                        const next = value as TermDetailChartPeriodPreset;
                        if (next === "custom") {
                          setCustomOpen(true);
                          return;
                        }

                        onPeriodChange(next);
                      }}
                    >
                      {ROLLING_PERIODS.map((option) => (
                        <DropdownMenuRadioItem key={option} value={option}>
                          {TOPIC_DETAIL_CHART_PERIOD_LABELS[option]}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>Calendar</DropdownMenuLabel>
                    <DropdownMenuRadioGroup
                      value={period}
                      onValueChange={(value) => {
                        const next = value as TermDetailChartPeriodPreset;
                        if (next === "custom") {
                          setCustomOpen(true);
                          return;
                        }

                        onPeriodChange(next);
                      }}
                    >
                      {CALENDAR_PERIODS.map((option) => (
                        <DropdownMenuRadioItem key={option} value={option}>
                          {TOPIC_DETAIL_CHART_PERIOD_LABELS[option]}
                        </DropdownMenuRadioItem>
                      ))}
                      <DropdownMenuRadioItem value="custom">
                        {TOPIC_DETAIL_CHART_PERIOD_LABELS.custom}
                      </DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="min-w-36 justify-between"
                      disabled={isLoading}
                    />
                  }
                >
                  {TERM_DETAIL_CHART_METRIC_LABELS[metric]}
                  <ChevronDownIcon className="size-4 text-muted-foreground" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-44">
                  <DropdownMenuRadioGroup
                    value={metric}
                    onValueChange={(value) =>
                      onMetricChange(value as TermDetailChartMetric)
                    }
                  >
                    {TOPIC_DETAIL_CHART_METRICS.map((option) => (
                      <DropdownMenuRadioItem key={option} value={option}>
                        {TERM_DETAIL_CHART_METRIC_LABELS[option]}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {isLoading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-16 rounded-lg" />
                ))}
              </div>
              <Skeleton className="h-56 w-full rounded-lg" />
            </div>
          ) : errorMessage ? (
            <p className="text-sm text-destructive">{errorMessage}</p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-lg border px-3 py-2">
                  <p className="text-lg font-semibold tabular-nums">
                    {digest?.docCount ?? 0}
                  </p>
                  <p className="text-[11px] text-muted-foreground">Docs</p>
                </div>
                <div className="rounded-lg border px-3 py-2">
                  <p className="text-lg font-semibold tabular-nums">
                    {formatScore(digest?.avgQualityScore ?? null)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">Quality</p>
                </div>
                <div className="rounded-lg border px-3 py-2">
                  <p className="text-lg font-semibold tabular-nums">
                    {formatScore(digest?.trendScore ?? null)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">Trend</p>
                </div>
              </div>

              <ChartContainer config={chartConfig} className="aspect-auto h-56 w-full">
                <BarChart data={chartData} margin={{ left: 0, right: 8, top: 8 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    minTickGap={24}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={40}
                    tickFormatter={(value: number) =>
                      metric === "doc_count"
                        ? value.toLocaleString()
                        : value.toFixed(1)
                    }
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value) =>
                          formatMetricValue(metric, Number(value))
                        }
                      />
                    }
                  />
                  <Bar
                    dataKey="value"
                    fill="var(--color-value)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            </>
          )}
        </CardContent>
      </Card>

      <TermCustomPeriodDialog
        open={customOpen}
        onOpenChange={setCustomOpen}
        startDate={customStartDate}
        endDate={customEndDate}
        onApply={(range) => {
          onCustomRangeApply(range);
          onPeriodChange("custom");
          setCustomOpen(false);
        }}
      />
    </>
  );
}
