"use client";

import Link from "next/link";
import { useT } from "next-i18next/client";
import { Area, AreaChart } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { growthPercent } from "@/lib/metrics/formulas";
import { PROJECT_CASE_ICONS } from "@/lib/projects/project-cases";
import type { ProjectSummaryItem } from "@/lib/projects/types";
import { cn } from "@/lib/utils";

type ProjectSummaryCardProps = {
  project: ProjectSummaryItem;
  href: string;
};

function signed(value: number) {
  return `${value > 0 ? "+" : ""}${value}`;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium tabular-nums">{value}</p>
    </div>
  );
}

export function ProjectSummaryCard({ project, href }: ProjectSummaryCardProps) {
  const { t } = useT("dashboard");
  const growth = growthPercent(project.mentions, project.previousMentions);

  const chartConfig = {
    mentions: { label: t("projectList.chartLabel"), color: "var(--chart-1)" },
  } satisfies ChartConfig;
  const chartData = project.daily.map((point) => {
    const [, month, day] = point.dateKey.split("-");
    return { label: `${parseInt(day)}/${parseInt(month)}`, mentions: point.mentions };
  });
  const gradientId = `mentions-fill-${project.id}`;

  return (
    <Link href={href} className="block">
      <Card className="h-full transition-colors hover:bg-muted/40">
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            <span aria-hidden="true">{PROJECT_CASE_ICONS[project.case]}</span>
            <span className="min-w-0 truncate">{project.name}</span>
            <span className="rounded-full bg-[var(--tile-sun)] px-2 py-0.5 text-[11.5px] font-semibold text-[var(--tile-sun-foreground)]">
              {t(`cases.${project.case}`)}
            </span>
          </CardTitle>
          {project.description ? (
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {project.description}
            </p>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-2xl font-semibold tabular-nums tracking-tight">
                {project.mentions.toLocaleString()}{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  {t("projectList.mentions")}
                </span>
              </p>
              <p className="text-xs text-muted-foreground">
                {growth !== null ? (
                  <span
                    className={cn(
                      "mr-1 font-medium",
                      growth >= 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-destructive",
                    )}
                  >
                    {signed(growth)}%
                  </span>
                ) : null}
                {t("projectList.vsPrevious")}
              </p>
            </div>
          </div>

          <ChartContainer config={chartConfig} className="aspect-auto h-16 w-full">
            <AreaChart data={chartData} margin={{ left: 0, right: 0, top: 2, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-mentions)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--color-mentions)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideIndicator />}
              />
              <Area
                dataKey="mentions"
                type="monotone"
                stroke="var(--color-mentions)"
                strokeWidth={1.5}
                fill={`url(#${gradientId})`}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ChartContainer>

          <div className="grid grid-cols-4 gap-2 border-t pt-3">
            <Metric
              label={t("projectList.nss")}
              value={project.nss === null ? "—" : signed(project.nss)}
            />
            <Metric
              label={t("projectList.negative")}
              value={project.negativeShare === null ? "—" : `${project.negativeShare}%`}
            />
            <Metric
              label={t("projectList.alerts")}
              value={project.alerts.toLocaleString()}
            />
            <Metric
              label={t("projectList.sources")}
              value={project.sources.toLocaleString()}
            />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
