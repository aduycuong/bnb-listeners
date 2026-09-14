"use client";

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
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import type { GetDashboardOverviewResult } from "@/lib/dashboard/types";

const chartConfig = {
  docCount: {
    label: "Documents",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

type DashboardIngestionChartProps = {
  data?: GetDashboardOverviewResult;
  isLoading?: boolean;
};

function formatDateLabel(dateKey: string) {
  const [, month, day] = dateKey.split("-");
  return `${parseInt(month)}/${parseInt(day)}`;
}

export function DashboardIngestionChart({
  data,
  isLoading = false,
}: DashboardIngestionChartProps) {
  const chartData =
    data?.dailyIngestion.map((point) => ({
      label: formatDateLabel(point.dateKey),
      docCount: point.docCount,
    })) ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Documents ingested</CardTitle>
        <CardDescription>Daily count — last 30 days</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading || !data ? (
          <Skeleton className="h-48 w-full rounded-lg" />
        ) : (
          <ChartContainer config={chartConfig} className="aspect-auto h-48 w-full">
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
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) =>
                      Number(value).toLocaleString()
                    }
                  />
                }
              />
              <Bar
                dataKey="docCount"
                fill="var(--color-docCount)"
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
