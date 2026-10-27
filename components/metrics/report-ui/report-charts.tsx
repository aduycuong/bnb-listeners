"use client";

import type { ComponentProps } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  XAxis,
  YAxis,
} from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  AQUA_ASPECTS,
  AQUA_BRAND_COLORS,
  AQUA_CHANNEL_COLORS,
  AQUA_CHANNELS,
  AQUA_DAYS,
  type AquaTrend,
} from "@/lib/projects/aqua-demo";

const sentimentConfig = {
  positive: { label: "Tích cực", color: "var(--pos)" },
  neutral: { label: "Trung lập", color: "var(--neu)" },
  negative: { label: "Tiêu cực", color: "var(--neg)" },
} satisfies ChartConfig;

function ChartBox({
  height,
  config,
  children,
}: {
  height: number;
  config: ChartConfig;
  children: ComponentProps<typeof ChartContainer>["children"];
}) {
  return (
    <ChartContainer
      config={config}
      className="aspect-auto w-full"
      style={{ height }}
      initialDimension={{ width: 640, height }}
    >
      {children}
    </ChartContainer>
  );
}

export function TrendChart({
  trend,
  brands,
  days = AQUA_DAYS,
}: {
  trend: AquaTrend;
  brands: Record<string, number[]> | null;
  /** Axis labels, one per value. Defaults to the standard 14 days. */
  days?: readonly string[];
}) {
  if (brands) {
    const names = Object.keys(brands);
    const data = days.map((day, index) => ({
      day,
      ...Object.fromEntries(names.map((name) => [name, brands[name][index]])),
    }));
    const config = Object.fromEntries(
      names.map((name, index) => [
        name,
        { label: name, color: AQUA_BRAND_COLORS[index % AQUA_BRAND_COLORS.length] },
      ]),
    ) satisfies ChartConfig;

    return (
      <ChartBox height={300} config={config}>
        <LineChart data={data}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="day" tickLine={false} axisLine={false} />
          <YAxis tickLine={false} axisLine={false} width={40} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Legend verticalAlign="top" align="right" iconType="circle" />
          {names.map((name, index) => (
            <Line
              key={name}
              type="monotone"
              dataKey={name}
              stroke={AQUA_BRAND_COLORS[index % AQUA_BRAND_COLORS.length]}
              strokeWidth={index === 0 ? 3 : 2}
              dot={false}
            />
          ))}
        </LineChart>
      </ChartBox>
    );
  }

  const data = days.map((day, index) => ({
    day,
    positive: trend.pos[index],
    neutral: trend.neu[index],
    negative: trend.neg[index],
  }));

  return (
    <ChartBox height={300} config={sentimentConfig}>
      <BarChart data={data}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="day" tickLine={false} axisLine={false} />
        <YAxis tickLine={false} axisLine={false} width={40} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Legend verticalAlign="top" align="right" iconType="circle" />
        <Bar dataKey="positive" stackId="sentiment" fill="var(--pos)" />
        <Bar dataKey="neutral" stackId="sentiment" fill="var(--neu)" />
        <Bar dataKey="negative" stackId="sentiment" fill="var(--neg)" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ChartBox>
  );
}

export function DonutChart({
  data,
  colors,
  height = 220,
  cutout = "68%",
}: {
  data: { name: string; value: number }[];
  colors: string[];
  height?: number;
  cutout?: string;
}) {
  const config = Object.fromEntries(
    data.map((item, index) => [
      item.name,
      { label: item.name, color: colors[index] },
    ]),
  ) satisfies ChartConfig;

  return (
    <ChartBox height={height} config={config}>
      <PieChart>
        <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={cutout}
          outerRadius="92%"
          stroke="var(--card)"
          strokeWidth={2}
        >
          {data.map((item, index) => (
            <Cell key={item.name} fill={colors[index]} />
          ))}
        </Pie>
        <Legend
          layout="vertical"
          verticalAlign="middle"
          align="right"
          iconType="circle"
        />
      </PieChart>
    </ChartBox>
  );
}

export function NssChart({
  values,
  days = AQUA_DAYS,
}: {
  /** One value per day; null leaves a gap (no mention with a sentiment that day). */
  values: (number | null)[];
  days?: readonly string[];
}) {
  const data = days.map((day, index) => ({ day, nss: values[index] }));

  return (
    <ChartBox height={260} config={{ nss: { label: "NSS", color: "var(--primary)" } }}>
      <LineChart data={data}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="day" tickLine={false} axisLine={false} />
        <YAxis domain={[-100, 100]} tickLine={false} axisLine={false} width={36} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line
          type="monotone"
          dataKey="nss"
          stroke="var(--primary)"
          strokeWidth={2}
          fill="rgba(0,145,255,0.14)"
          dot={(props) => {
            const { cx, cy, payload } = props as {
              cx?: number;
              cy?: number;
              payload?: { nss: number | null };
            };
            if (cx == null || cy == null || payload?.nss == null) {
              return <g />;
            }
            return (
              <circle
                cx={cx}
                cy={cy}
                r={3}
                fill={payload.nss < 0 ? "var(--neg)" : "var(--primary)"}
              />
            );
          }}
        />
      </LineChart>
    </ChartBox>
  );
}

export function EmotionChart({ values }: { values: number[] }) {
  const labels = ["Hài lòng", "Tin tưởng", "Bất ngờ", "Lo lắng", "Tức giận", "Thất vọng"];
  const colors = ["var(--pos)", "#0A6CFF", "#FFC53D", "#FF9F43", "var(--neg)", "#B4436C"];
  const data = labels.map((name, index) => ({ name, value: values[index] }));

  return (
    <ChartBox height={260} config={{ value: { label: "Tỷ lệ", color: "var(--primary)" } }}>
      <BarChart data={data} layout="vertical" margin={{ left: 16 }}>
        <CartesianGrid horizontal={false} stroke="var(--border)" />
        <XAxis type="number" tickFormatter={(value) => `${value}%`} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="name" width={72} tickLine={false} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="value" radius={5}>
          {data.map((item, index) => (
            <Cell key={item.name} fill={colors[index]} />
          ))}
        </Bar>
      </BarChart>
    </ChartBox>
  );
}

export function AspectChart({
  aspects,
  names = AQUA_ASPECTS,
}: {
  aspects: { positive: number; negative: number }[];
  /** Aspect names in the order of `aspects`. */
  names?: readonly string[];
}) {
  const data = names.map((name, index) => ({
    name,
    positive: aspects[index]?.positive ?? 0,
    negative: -(aspects[index]?.negative ?? 0),
  }));

  return (
    <ChartBox height={340} config={sentimentConfig}>
      <BarChart data={data} layout="vertical" stackOffset="sign" margin={{ left: 8 }}>
        <CartesianGrid horizontal={false} stroke="var(--border)" />
        <XAxis
          type="number"
          domain={[-100, 100]}
          tickFormatter={(value) => `${Math.abs(Number(value))}%`}
          tickLine={false}
          axisLine={false}
        />
        <YAxis type="category" dataKey="name" width={148} tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Legend verticalAlign="top" align="right" iconType="circle" />
        <Bar dataKey="negative" stackId="aspect" fill="var(--neg)" radius={4} />
        <Bar dataKey="positive" stackId="aspect" fill="var(--pos)" radius={4} />
      </BarChart>
    </ChartBox>
  );
}

export function GrowthChart({
  topics,
  labelWidth = 140,
  maxLabelLength,
}: {
  /** `id` tells topics with the same name apart; the name is used when it is missing. */
  topics: { id?: string; name: string; growth: number; negative: number }[];
  labelWidth?: number;
  /** Long names are cut with an ellipsis on the axis; the tooltip keeps the full name. */
  maxLabelLength?: number;
}) {
  const sorted = [...topics].sort((a, b) => b.growth - a.growth);
  const data = sorted.map((topic) => ({
    key: topic.id ?? topic.name,
    name: topic.name,
    growth: topic.growth,
    fill:
      topic.growth < 0
        ? "var(--neg)"
        : topic.negative >= 50
          ? "#FF9F43"
          : "var(--primary)",
  }));
  const names = new Map(data.map((item) => [item.key, item.name]));

  return (
    <ChartBox
      height={Math.max(260, data.length * 30)}
      config={{ growth: { label: "Tăng trưởng", color: "var(--primary)" } }}
    >
      <BarChart data={data} layout="vertical" margin={{ left: 12 }}>
        <CartesianGrid horizontal={false} stroke="var(--border)" />
        <XAxis type="number" tickFormatter={(value) => `${value}%`} tickLine={false} axisLine={false} />
        <YAxis
          type="category"
          dataKey="key"
          width={labelWidth}
          tickLine={false}
          axisLine={false}
          tickFormatter={(key: string) => {
            const name = names.get(key) ?? key;
            return maxLabelLength && name.length > maxLabelLength
              ? `${name.slice(0, maxLabelLength - 1).trimEnd()}…`
              : name;
          }}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent labelFormatter={(key) => names.get(String(key)) ?? key} />
          }
        />
        <Bar dataKey="growth" radius={5}>
          {data.map((item) => (
            <Cell key={item.key} fill={item.fill} />
          ))}
        </Bar>
      </BarChart>
    </ChartBox>
  );
}

export function ChannelMixChart({
  channels,
  names = AQUA_CHANNELS,
}: {
  channels: number[];
  /** Channel names in the order of `channels`. */
  names?: readonly string[];
}) {
  const data = names.map((name, index) => ({
    name,
    value: channels[index],
  }));
  // A known channel keeps its palette color wherever it sits in the list.
  const colors = names.map((name, index) => {
    const channelIndex = AQUA_CHANNELS.indexOf(name);
    return AQUA_CHANNEL_COLORS[channelIndex >= 0 ? channelIndex : index % AQUA_CHANNEL_COLORS.length];
  });

  return <DonutChart data={data} colors={colors} height={260} cutout="60%" />;
}

const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

/** Mentions per weekday (rows, Monday first) and hour (columns); colour by share of the busiest cell. */
export function HeatmapChart({ counts }: { counts: number[][] }) {
  const max = Math.max(1, ...counts.flat());
  const hours = Array.from({ length: 24 }, (_, hour) => hour);

  return (
    <>
      <div className="overflow-x-auto">
        <div
          className="grid min-w-[560px] gap-[3px] text-[10.5px] text-muted-foreground"
          style={{ gridTemplateColumns: "34px repeat(24, minmax(18px, 1fr))" }}
        >
          <div />
          {hours.map((hour) => (
            <div key={hour} className="text-center">
              {hour % 3 === 0 ? `${hour}h` : ""}
            </div>
          ))}
          {WEEKDAYS.map((day, dayIndex) => (
            <div key={day} className="contents">
              <div className="flex items-center">{day}</div>
              {hours.map((hour) => {
                const count = counts[dayIndex]?.[hour] ?? 0;
                return (
                  <div
                    key={hour}
                    title={`${day} ${hour}h: ${count} đề cập`}
                    className="h-[22px] rounded"
                    style={{ background: `rgba(0,145,255,${(0.06 + (count / max) * 0.94).toFixed(2)})` }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
        Ít
        {[0.08, 0.35, 0.65, 1].map((alpha) => (
          <i
            key={alpha}
            className="inline-block h-3 w-4 rounded-sm"
            style={{ background: `rgba(0,145,255,${alpha})` }}
          />
        ))}
        Nhiều
      </div>
    </>
  );
}

export function ChannelSentimentChart({
  rows,
}: {
  rows: { channel: string; positive: number; neutral: number; negative: number }[];
}) {
  return (
    <ChartBox height={260} config={sentimentConfig}>
      <BarChart data={rows}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="channel" tickLine={false} axisLine={false} interval={0} tick={{ fontSize: 11 }} />
        <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} tickLine={false} axisLine={false} width={36} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Legend verticalAlign="top" align="right" iconType="circle" />
        <Bar dataKey="positive" stackId="mix" fill="var(--pos)" />
        <Bar dataKey="neutral" stackId="mix" fill="var(--neu)" />
        <Bar dataKey="negative" stackId="mix" fill="var(--neg)" />
      </BarChart>
    </ChartBox>
  );
}

/** Half-donut score out of 100, with the score and its label in the middle. */
export function GaugeChart({ score, label }: { score: number; label: string }) {
  return (
    <div className="relative h-[180px]">
      <ChartBox
        height={180}
        config={{ score: { label: "Điểm", color: "var(--primary)" } }}
      >
        <PieChart>
          <Pie
            data={[
              { name: "score", value: score },
              { name: "rest", value: 100 - score },
            ]}
            dataKey="value"
            startAngle={180}
            endAngle={0}
            innerRadius="78%"
            outerRadius="100%"
            stroke="none"
            cy="78%"
          >
            <Cell fill="var(--primary)" />
            <Cell fill="var(--muted)" />
          </Pie>
        </PieChart>
      </ChartBox>
      <div className="pointer-events-none absolute inset-x-0 bottom-1 text-center">
        <b className="block text-[34px] leading-none font-extrabold tracking-tight">{score}</b>
        <small className="text-xs text-muted-foreground">/100 · {label}</small>
      </div>
    </div>
  );
}

/** Score of the tracked developer per period against the mean of its peers (dashed). */
export function HealthLineChart({
  labels,
  developer,
  peers,
  developerLabel,
  peersLabel,
}: {
  labels: string[];
  developer: (number | null)[];
  peers: (number | null)[] | null;
  developerLabel: string;
  peersLabel: string;
}) {
  const data = labels.map((label, index) => ({
    label,
    developer: developer[index],
    peers: peers?.[index] ?? null,
  }));

  return (
    <ChartBox
      height={220}
      config={{
        developer: { label: developerLabel, color: "var(--primary)" },
        peers: { label: peersLabel, color: "var(--muted-foreground)" },
      }}
    >
      <LineChart data={data}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} />
        <YAxis domain={[0, 100]} tickLine={false} axisLine={false} width={32} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Legend verticalAlign="top" align="right" iconType="circle" />
        <Line
          type="monotone"
          dataKey="developer"
          name={developerLabel}
          stroke="var(--primary)"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
        {peers ? (
          <Line
            type="monotone"
            dataKey="peers"
            name={peersLabel}
            stroke="var(--muted-foreground)"
            strokeDasharray="5 5"
            strokeWidth={2}
            dot={false}
            />
        ) : null}
      </LineChart>
    </ChartBox>
  );
}

export function PriceTrendChart({
  days,
  series,
}: {
  days: string[];
  series: { key: string; color: string; dashed?: boolean; dotted?: boolean; values: (number | null)[] }[];
}) {
  const data = days.map((day, index) => ({
    day,
    ...Object.fromEntries(series.map((item) => [item.key, item.values[index]])),
  }));
  const numbers = series.flatMap((item) => item.values.filter((value): value is number => value != null));
  const min = numbers.length ? Math.min(...numbers) : 0;
  const max = numbers.length ? Math.max(...numbers) : 1;
  const pad = Math.max((max - min) * 0.08, 1);
  const config = Object.fromEntries(
    series.map((item) => [item.key, { label: item.key, color: item.color }]),
  ) satisfies ChartConfig;

  return (
    <ChartBox height={260} config={config}>
      <LineChart data={data}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="day" tickLine={false} axisLine={false} />
        <YAxis domain={[Math.floor(min - pad), Math.ceil(max + pad)]} tickLine={false} axisLine={false} width={32} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Legend verticalAlign="top" align="right" iconType="circle" />
        {series.map((item) => (
          <Line
            key={item.key}
            type="monotone"
            dataKey={item.key}
            stroke={item.color}
            strokeWidth={2}
            strokeDasharray={item.dashed ? "6 6" : undefined}
            connectNulls={false}
            dot={item.dashed ? false : { r: item.dotted ? 3 : 2.5 }}
          />
        ))}
      </LineChart>
    </ChartBox>
  );
}

const BUCKET_COLORS = ["#FF6B6B", "#5CC8FF", "#0091FF", "#0091FF", "#5CC8FF"];

export function PriceBucketChart({
  buckets,
}: {
  buckets: { name: string; value: number }[];
}) {
  const data = buckets.map((bucket, index) => ({
    ...bucket,
    fill: BUCKET_COLORS[index] ?? "#0091FF",
  }));

  return (
    <ChartBox height={260} config={{ value: { label: "Số tin", color: "var(--primary)" } }}>
      <BarChart data={data}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="name" tickLine={false} axisLine={false} />
        <YAxis tickLine={false} axisLine={false} width={32} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="value" radius={4}>
          {data.map((item) => (
            <Cell key={item.name} fill={item.fill} />
          ))}
        </Bar>
      </BarChart>
    </ChartBox>
  );
}

export function BuyerIntentChart() {
  const weeks = ["Tuần 32", "Tuần 33", "Tuần 34", "Tuần 35", "Tuần 36", "Tuần 37", "Tuần 38", "Tuần 39"];
  const series = [
    { key: "Muốn mua", color: "#00C9A7", values: [34, 35, 33, 36, 37, 38, 40, 41] },
    { key: "Đang cân nhắc", color: "#5CC8FF", values: [30, 30, 31, 30, 30, 29, 29, 28] },
    { key: "Chờ giảm giá", color: "#FFC93C", values: [22, 21, 22, 20, 20, 19, 18, 18] },
    { key: "Muốn bán", color: "#FF6B6B", values: [14, 14, 14, 14, 13, 14, 13, 13] },
  ];
  const data = weeks.map((week, index) => ({
    week,
    ...Object.fromEntries(series.map((item) => [item.key, item.values[index]])),
  }));
  const config = Object.fromEntries(
    series.map((item) => [item.key, { label: item.key, color: item.color }]),
  ) satisfies ChartConfig;

  return (
    <ChartBox height={260} config={config}>
      <BarChart data={data}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="week" tickLine={false} axisLine={false} interval={0} tick={{ fontSize: 11 }} />
        <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} tickLine={false} axisLine={false} width={36} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Legend verticalAlign="top" align="right" iconType="circle" />
        {series.map((item) => (
          <Bar key={item.key} dataKey={item.key} stackId="intent" fill={item.color} />
        ))}
      </BarChart>
    </ChartBox>
  );
}

/** NSS per project of a developer, as horizontal bars (red below zero). */
export function ProjectSentimentChart({ rows }: { rows: { name: string; value: number }[] }) {
  return (
    <ChartBox
      height={Math.max(160, rows.length * 44 + 40)}
      config={{ value: { label: "NSS", color: "var(--pos)" } }}
    >
      <BarChart data={rows} layout="vertical">
        <CartesianGrid horizontal={false} stroke="var(--border)" />
        <XAxis type="number" domain={[-100, 100]} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="name" width={120} tickLine={false} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="value" radius={4}>
          {rows.map((row) => (
            <Cell key={row.name} fill={row.value < 0 ? "var(--neg)" : "var(--pos)"} />
          ))}
        </Bar>
      </BarChart>
    </ChartBox>
  );
}

export function VelocityChart({
  points,
}: {
  points: { label: string; value: number }[];
}) {
  return (
    <ChartBox height={260} config={{ value: { label: "Bài/giờ", color: "var(--neg)" } }}>
      <BarChart data={points}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} interval={3} />
        <YAxis tickLine={false} axisLine={false} width={32} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="value" radius={2}>
          {points.map((point, index) => (
            <Cell
              key={`${point.label}-${index}`}
              fill={point.value >= 80 ? "#FF6B6B" : point.value >= 50 ? "#FFC93C" : "var(--neu)"}
            />
          ))}
        </Bar>
      </BarChart>
    </ChartBox>
  );
}

export function RadarAttributeChart({
  labels,
  series,
}: {
  labels: string[];
  series: { key: string; color: string; values: number[] }[];
}) {
  const data = labels.map((label, index) => ({
    label,
    ...Object.fromEntries(series.map((item) => [item.key, item.values[index]])),
  }));
  const config = Object.fromEntries(
    series.map((item) => [item.key, { label: item.key, color: item.color }]),
  ) satisfies ChartConfig;

  return (
    <ChartBox height={300} config={config}>
      <RadarChart data={data}>
        <PolarGrid stroke="var(--border)" />
        <PolarAngleAxis dataKey="label" tick={{ fontSize: 11 }} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Legend verticalAlign="bottom" iconType="circle" />
        {series.map((item) => (
          <Radar
            key={item.key}
            dataKey={item.key}
            stroke={item.color}
            fill={item.color}
            fillOpacity={0.15}
          />
        ))}
      </RadarChart>
    </ChartBox>
  );
}
