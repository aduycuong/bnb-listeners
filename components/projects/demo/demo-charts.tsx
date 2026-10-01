"use client";

import type { ComponentProps } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
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
  AQUA_BRAND_COLORS,
  AQUA_BRAND_NAMES,
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
}: {
  trend: AquaTrend;
  brands: Record<string, number[]> | null;
}) {
  if (brands) {
    const data = AQUA_DAYS.map((day, index) => ({
      day,
      Aqua: brands.Aqua[index],
      Breeze: brands.Breeze[index],
      Nami: brands.Nami[index],
      Coolo: brands.Coolo[index],
    }));
    const config = Object.fromEntries(
      AQUA_BRAND_NAMES.map((name, index) => [
        name,
        { label: name, color: AQUA_BRAND_COLORS[index] },
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
          {AQUA_BRAND_NAMES.map((name, index) => (
            <Line
              key={name}
              type="monotone"
              dataKey={name}
              stroke={AQUA_BRAND_COLORS[index]}
              strokeWidth={index === 0 ? 3 : 2}
              dot={false}
            />
          ))}
        </LineChart>
      </ChartBox>
    );
  }

  const data = AQUA_DAYS.map((day, index) => ({
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

export function NssChart({ values }: { values: number[] }) {
  const data = AQUA_DAYS.map((day, index) => ({ day, nss: values[index] }));

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
              payload?: { nss: number };
            };
            if (cx == null || cy == null) {
              return <g />;
            }
            return (
              <circle
                cx={cx}
                cy={cy}
                r={3}
                fill={payload && payload.nss < 0 ? "var(--neg)" : "var(--primary)"}
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
}: {
  aspects: { positive: number; negative: number }[];
}) {
  const labels = ["Giá", "Chất lượng", "Bao bì", "Giao hàng", "CSKH", "Khuyến mãi"];
  const data = labels.map((name, index) => ({
    name,
    positive: aspects[index]?.positive ?? 0,
    negative: -(aspects[index]?.negative ?? 0),
  }));

  return (
    <ChartBox height={260} config={sentimentConfig}>
      <BarChart data={data} layout="vertical" stackOffset="sign" margin={{ left: 8 }}>
        <CartesianGrid horizontal={false} stroke="var(--border)" />
        <XAxis
          type="number"
          domain={[-100, 100]}
          tickFormatter={(value) => `${Math.abs(Number(value))}%`}
          tickLine={false}
          axisLine={false}
        />
        <YAxis type="category" dataKey="name" width={84} tickLine={false} axisLine={false} />
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
}: {
  topics: { name: string; growth: number; negative: number }[];
}) {
  const sorted = [...topics].sort((a, b) => b.growth - a.growth);
  const data = sorted.map((topic) => ({
    name: topic.name,
    growth: topic.growth,
    fill:
      topic.growth < 0
        ? "var(--neg)"
        : topic.negative >= 50
          ? "#FF9F43"
          : "var(--primary)",
  }));

  return (
    <ChartBox height={260} config={{ growth: { label: "Tăng trưởng", color: "var(--primary)" } }}>
      <BarChart data={data} layout="vertical" margin={{ left: 12 }}>
        <CartesianGrid horizontal={false} stroke="var(--border)" />
        <XAxis type="number" tickFormatter={(value) => `${value}%`} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="name" width={140} tickLine={false} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="growth" radius={5}>
          {data.map((item) => (
            <Cell key={item.name} fill={item.fill} />
          ))}
        </Bar>
      </BarChart>
    </ChartBox>
  );
}

export function ChannelMixChart({
  channels,
}: {
  channels: number[];
}) {
  const data = AQUA_CHANNELS.map((name, index) => ({
    name,
    value: channels[index],
  }));

  return (
    <DonutChart data={data} colors={[...AQUA_CHANNEL_COLORS]} height={260} cutout="60%" />
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

export function GaugeChart() {
  return (
    <div className="relative h-[180px]">
      <ChartBox
        height={180}
        config={{ score: { label: "Điểm", color: "var(--primary)" } }}
      >
        <PieChart>
          <Pie
            data={[
              { name: "score", value: 74 },
              { name: "rest", value: 26 },
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
        <b className="block text-[34px] leading-none font-extrabold tracking-tight">74</b>
        <small className="text-xs text-muted-foreground">/100 · tốt</small>
      </div>
    </div>
  );
}

export function HealthLineChart() {
  const data = ["T5", "T6", "T7", "T8", "T9", "T10"].map((month, index) => ({
    month,
    Aqua: [64, 66, 69, 68, 71, 74][index],
    industry: [58, 59, 60, 60, 61, 62][index],
  }));

  return (
    <ChartBox
      height={220}
      config={{
        Aqua: { label: "Aqua", color: "var(--primary)" },
        industry: { label: "TB ngành", color: "var(--muted-foreground)" },
      }}
    >
      <LineChart data={data}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="month" tickLine={false} axisLine={false} />
        <YAxis domain={[50, 80]} tickLine={false} axisLine={false} width={32} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Legend verticalAlign="top" align="right" iconType="circle" />
        <Line type="monotone" dataKey="Aqua" stroke="var(--primary)" strokeWidth={2} dot={false} />
        <Line
          type="monotone"
          dataKey="industry"
          stroke="var(--muted-foreground)"
          strokeDasharray="5 5"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ChartBox>
  );
}

export function PhaseChart() {
  const data = [
    { name: "Teaser (18/9–21/9)", mentions: 247, nss: 58 },
    { name: "Kích hoạt (22/9–26/9)", mentions: 2205, nss: 68 },
    { name: "Lan tỏa (27/9–10/10)", mentions: 1905, nss: 69 },
  ];

  return (
    <ChartBox
      height={260}
      config={{
        mentions: { label: "Đề cập/ngày", color: "var(--primary)" },
        nss: { label: "NSS", color: "var(--sun)" },
      }}
    >
      <ComposedChart data={data}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="name" tickLine={false} axisLine={false} interval={0} tick={{ fontSize: 11 }} />
        <YAxis yAxisId="left" tickLine={false} axisLine={false} width={36} />
        <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tickLine={false} axisLine={false} width={32} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Legend verticalAlign="top" align="right" iconType="circle" />
        <Bar yAxisId="left" dataKey="mentions" fill="var(--primary)" radius={6} />
        <Line yAxisId="right" type="monotone" dataKey="nss" stroke="var(--sun)" strokeWidth={2} dot={false} />
      </ComposedChart>
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
              fill={point.value >= 150 ? "#E5484D" : point.value >= 80 ? "#FF9F43" : "var(--neu)"}
            />
          ))}
        </Bar>
      </BarChart>
    </ChartBox>
  );
}

export function BrandSentimentChart() {
  const data = AQUA_BRAND_NAMES.map((name, index) => ({
    name,
    positive: [66, 55, 59, 44][index],
    neutral: [24, 28, 29, 34][index],
    negative: [10, 17, 12, 22][index],
  }));

  return (
    <ChartBox height={220} config={sentimentConfig}>
      <BarChart data={data} layout="vertical">
        <CartesianGrid horizontal={false} stroke="var(--border)" />
        <XAxis type="number" domain={[0, 100]} tickFormatter={(value) => `${value}%`} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="name" width={64} tickLine={false} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Legend verticalAlign="top" align="right" iconType="circle" />
        <Bar dataKey="positive" stackId="brand" fill="var(--pos)" />
        <Bar dataKey="neutral" stackId="brand" fill="var(--neu)" />
        <Bar dataKey="negative" stackId="brand" fill="var(--neg)" />
      </BarChart>
    </ChartBox>
  );
}

export function RadarAttributeChart() {
  const labels = ["Giá", "Chất lượng", "Bao bì", "Khuyến mãi", "Phân phối", "Môi trường"];
  const series = [
    { key: "Aqua", color: "#0091FF", values: [72, 80, 86, 58, 70, 66] },
    { key: "Breeze", color: "#FFC93C", values: [78, 62, 74, 88, 64, 40] },
    { key: "Nami", color: "#00C9A7", values: [60, 76, 58, 52, 56, 48] },
  ];
  const data = labels.map((label, index) => ({
    label,
    Aqua: series[0].values[index],
    Breeze: series[1].values[index],
    Nami: series[2].values[index],
  }));
  const config = Object.fromEntries(
    series.map((item) => [item.key, { label: item.key, color: item.color }]),
  ) satisfies ChartConfig;

  return (
    <ChartBox height={300} config={config}>
      <RadarChart data={data}>
        <PolarGrid stroke="var(--border)" />
        <PolarAngleAxis dataKey="label" tick={{ fontSize: 12 }} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Legend verticalAlign="bottom" iconType="circle" />
        {series.map((item) => (
          <Radar
            key={item.key}
            dataKey={item.key}
            stroke={item.color}
            fill={item.color}
            fillOpacity={0.13}
          />
        ))}
      </RadarChart>
    </ChartBox>
  );
}
