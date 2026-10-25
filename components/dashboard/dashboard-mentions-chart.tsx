"use client";

import { useT } from "next-i18next/client";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import type { GetDashboardOverviewResult } from "@/lib/dashboard/types";

type DashboardMentionsChartProps = {
  data?: GetDashboardOverviewResult;
  isLoading?: boolean;
};

function formatDateLabel(dateKey: string) {
  const [, month, day] = dateKey.split("-");
  return `${parseInt(day)}/${parseInt(month)}`;
}

export function DashboardMentionsChart({
  data,
  isLoading = false,
}: DashboardMentionsChartProps) {
  const { t } = useT("dashboard");

  const chartConfig = {
    positive: { label: t("overview.chart.positive"), color: "var(--chart-2)" },
    neutral: { label: t("overview.chart.neutral"), color: "var(--chart-3)" },
    negative: { label: t("overview.chart.negative"), color: "var(--chart-5)" },
    unknown: { label: t("overview.chart.unknown"), color: "var(--muted-foreground)" },
  } satisfies ChartConfig;

  const chartData =
    data?.daily.map((point) => ({
      label: formatDateLabel(point.dateKey),
      positive: point.positive,
      neutral: point.neutral,
      negative: point.negative,
      unknown: point.unknown,
    })) ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("overview.chart.title")}</CardTitle>
        <CardDescription>
          {t("overview.chart.description", { days: data?.periodDays ?? 30 })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading || !data ? (
          <Skeleton className="h-64 w-full rounded-lg" />
        ) : (
          <ChartContainer config={chartConfig} className="aspect-auto h-64 w-full">
            <BarChart data={chartData} margin={{ left: 0, right: 8, top: 4 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                minTickGap={20}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={36}
                allowDecimals={false}
                tick={{ fontSize: 11 }}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="positive" stackId="a" fill="var(--color-positive)" />
              <Bar dataKey="neutral" stackId="a" fill="var(--color-neutral)" />
              <Bar dataKey="negative" stackId="a" fill="var(--color-negative)" />
              <Bar
                dataKey="unknown"
                stackId="a"
                fill="var(--color-unknown)"
                fillOpacity={0.35}
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
