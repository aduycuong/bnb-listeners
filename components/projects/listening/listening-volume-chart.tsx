"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";

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
import type { ListeningDemo } from "@/lib/projects/listening-demo-data";

import { formatCount, SENTIMENT_META } from "./listening-ui";

const chartConfig = {
  negative: {
    label: SENTIMENT_META.negative.label,
    color: SENTIMENT_META.negative.color,
  },
  neutral: {
    label: SENTIMENT_META.neutral.label,
    color: SENTIMENT_META.neutral.color,
  },
  positive: {
    label: SENTIMENT_META.positive.label,
    color: SENTIMENT_META.positive.color,
  },
  competitors: {
    label: "Đối thủ trung bình",
    color: "oklch(0.72 0.06 230)",
  },
} satisfies ChartConfig;

const SERIES = ["negative", "neutral", "positive"] as const;

type ListeningVolumeChartProps = {
  demo: ListeningDemo;
};

type PeakLabelProps = {
  viewBox?: { x?: number };
  title: string;
  cause: string;
};

function PeakLabel({ viewBox, title, cause }: PeakLabelProps) {
  const x = viewBox?.x ?? 0;

  return (
    <text
      x={x - 8}
      y={14}
      textAnchor="end"
      fill="currentColor"
      fontSize={11}
    >
      <tspan x={x - 8} dy={0}>
        {title}
      </tspan>
      <tspan x={x - 8} dy={14}>
        {cause}
      </tspan>
    </text>
  );
}

export function ListeningVolumeChart({ demo }: ListeningVolumeChartProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Thảo luận theo ngày</CardTitle>
        <CardDescription>
          Nét đứt là mặt bằng đối thủ. Đỉnh {demo.peak.label}:{" "}
          {formatCount(demo.peak.total)} thảo luận.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {SERIES.map((key) => (
            <span key={key} className="inline-flex items-center gap-1.5">
              <span
                className="size-2 rounded-[2px]"
                style={{ backgroundColor: SENTIMENT_META[key].color }}
              />
              {SENTIMENT_META[key].label}
            </span>
          ))}
          <span className="inline-flex items-center gap-1.5">
            <span className="h-px w-4 border-t border-dashed border-[oklch(0.72_0.06_230)]" />
            Đối thủ trung bình
          </span>
        </div>
        <ChartContainer config={chartConfig} className="aspect-auto h-72 w-full">
          <ComposedChart data={demo.volume} margin={{ left: 0, right: 8, top: 28 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              minTickGap={28}
              tick={{ fontSize: 11 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={44}
              tick={{ fontSize: 11 }}
              tickFormatter={(value) => formatCount(Number(value))}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            {SERIES.map((key) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stackId="discussion"
                stroke={`var(--color-${key})`}
                fill={`var(--color-${key})`}
                fillOpacity={0.9}
                strokeWidth={1.5}
              />
            ))}
            <Line
              type="monotone"
              dataKey="competitors"
              stroke="var(--color-competitors)"
              strokeDasharray="5 4"
              dot={false}
              strokeWidth={1.75}
            />
            <ReferenceLine
              x={demo.peak.label}
              stroke="var(--color-competitors)"
              strokeDasharray="3 3"
              label={
                <PeakLabel
                  title={`${demo.peak.label} · ${formatCount(demo.peak.total)}`}
                  cause={demo.peak.cause}
                />
              }
            />
          </ComposedChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
