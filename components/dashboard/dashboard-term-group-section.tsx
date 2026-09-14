"use client";

import { Bar, BarChart, Cell, XAxis, YAxis } from "recharts";
import Link from "next/link";

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
import type {
  DashboardTermGroupItem,
  GetDashboardTermGroupsResult,
} from "@/lib/dashboard/types";
import { getTermGroupHref } from "@/lib/term-groups/term-group-config";

const chartConfig = {
  docCount: {
    label: "Documents",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

type TermGroupCardProps = {
  group: DashboardTermGroupItem;
  workspaceIndex: number;
  period: GetDashboardTermGroupsResult["period"];
};

function TermGroupCard({ group, workspaceIndex, period }: TermGroupCardProps) {
  const chartData = group.topTerms.map((term) => ({
    name: term.name,
    docCount: term.docCount,
    id: term.id,
  }));

  const hasData = chartData.some((d) => d.docCount > 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">
              <Link
                href={`${getTermGroupHref(workspaceIndex, group.id)}`}
                className="hover:underline"
              >
                {group.name}
              </Link>
            </CardTitle>
            {group.description ? (
              <CardDescription className="mt-0.5 line-clamp-1">
                {group.description}
              </CardDescription>
            ) : null}
          </div>
          <span className="shrink-0 text-xs text-muted-foreground">
            {group.memberCount} terms
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground">
          {period.startDate} – {period.endDate} · by trend score
        </p>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No activity in this period
          </p>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="w-full"
            style={{ height: Math.max(80, chartData.length * 28) }}
          >
            <BarChart
              layout="vertical"
              data={chartData}
              margin={{ top: 0, right: 8, bottom: 0, left: 0 }}
            >
              <XAxis
                type="number"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10 }}
                allowDecimals={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                tickLine={false}
                axisLine={false}
                width={120}
                tick={{ fontSize: 12 }}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => Number(value).toLocaleString()}
                  />
                }
              />
              <Bar dataKey="docCount" radius={[0, 3, 3, 0]}>
                {chartData.map((entry) => (
                  <Cell key={entry.id} fill="var(--color-docCount)" />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

type DashboardTermGroupSectionProps = {
  data?: GetDashboardTermGroupsResult;
  isLoading?: boolean;
  workspaceIndex: number;
};

export function DashboardTermGroupSection({
  data,
  isLoading = false,
  workspaceIndex,
}: DashboardTermGroupSectionProps) {
  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-40 w-full rounded-lg" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (data.groups.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No term groups yet. Create groups to track trending keywords.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {data.groups.map((group) => (
        <TermGroupCard
          key={group.id}
          group={group}
          workspaceIndex={workspaceIndex}
          period={data.period}
        />
      ))}
    </div>
  );
}
