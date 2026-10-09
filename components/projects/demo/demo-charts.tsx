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
}: {
  trend: AquaTrend;
  brands: Record<string, number[]> | null;
}) {
  if (brands) {
    const names = Object.keys(brands);
    const data = AQUA_DAYS.map((day, index) => ({
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
  const data = AQUA_ASPECTS.map((name, index) => ({
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
              { name: "score", value: 60 },
              { name: "rest", value: 40 },
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
        <b className="block text-[34px] leading-none font-extrabold tracking-tight">60</b>
        <small className="text-xs text-muted-foreground">/100 · khá</small>
      </div>
    </div>
  );
}

export function HealthLineChart() {
  const data = ["T5", "T6", "T7", "T8", "T9", "T10"].map((month, index) => ({
    month,
    developer: [52, 54, 57, 58, 59, 60][index],
    peers: [55, 55, 56, 56, 57, 57][index],
  }));

  return (
    <ChartBox
      height={220}
      config={{
        developer: { label: "Phát Đạt", color: "var(--primary)" },
        peers: { label: "TB chủ đầu tư cùng phân khúc", color: "var(--muted-foreground)" },
      }}
    >
      <LineChart data={data}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="month" tickLine={false} axisLine={false} />
        <YAxis domain={[45, 75]} tickLine={false} axisLine={false} width={32} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Legend verticalAlign="top" align="right" iconType="circle" />
        <Line type="monotone" dataKey="developer" stroke="var(--primary)" strokeWidth={2} dot={{ r: 3 }} />
        <Line
          type="monotone"
          dataKey="peers"
          stroke="var(--muted-foreground)"
          strokeDasharray="5 5"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ChartBox>
  );
}

export function PriceTrendChart() {
  const months = ["T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10"];
  const series = [
    { key: "La Pura", color: "#0091FF", values: [44.8, 45.3, 45.9, 46.4, 47, 47.6, 48.1, 48.6] },
    { key: "TB trục QL13", color: "#FFC93C", values: [44, 44.2, 44.5, 44.9, 45.2, 45.5, 45.8, 46] },
    { key: "TB Thuận An", color: "#00C9A7", values: [38.6, 38.9, 39.2, 39.6, 40, 40.3, 40.7, 41] },
    { key: "Giá khởi điểm", color: "var(--muted-foreground)", values: [46, 46, 46, 46, 46, 46, 46, 46] },
  ];
  const data = months.map((month, index) => ({
    month,
    ...Object.fromEntries(series.map((item) => [item.key, item.values[index]])),
  }));
  const config = Object.fromEntries(
    series.map((item) => [item.key, { label: item.key, color: item.color }]),
  ) satisfies ChartConfig;

  return (
    <ChartBox height={260} config={config}>
      <LineChart data={data}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="month" tickLine={false} axisLine={false} />
        <YAxis domain={[36, 52]} tickLine={false} axisLine={false} width={32} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Legend verticalAlign="top" align="right" iconType="circle" />
        {series.map((item) => (
          <Line
            key={item.key}
            type="monotone"
            dataKey={item.key}
            stroke={item.color}
            strokeWidth={2}
            strokeDasharray={item.key === "Giá khởi điểm" ? "6 6" : undefined}
            dot={item.key === "La Pura" ? { r: 3 } : false}
          />
        ))}
      </LineChart>
    </ChartBox>
  );
}

export function PriceBucketChart() {
  const data = [
    { name: "< 42", value: 18, fill: "#FF6B6B" },
    { name: "42–46", value: 64, fill: "#5CC8FF" },
    { name: "46–50", value: 186, fill: "#0091FF" },
    { name: "50–54", value: 92, fill: "#0091FF" },
    { name: "> 54", value: 22, fill: "#5CC8FF" },
  ];

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

export function ProjectSentimentChart() {
  const data = [
    { name: "Bắc Hà Thanh", value: 48 },
    { name: "La Pura", value: 41 },
    { name: "Quy Nhơn Iconic", value: 26 },
  ];

  return (
    <ChartBox height={260} config={{ value: { label: "NSS", color: "var(--pos)" } }}>
      <BarChart data={data} layout="vertical">
        <CartesianGrid horizontal={false} stroke="var(--border)" />
        <XAxis type="number" domain={[-40, 80]} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="name" width={120} tickLine={false} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="value" fill="var(--pos)" radius={4} />
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

export function RadarAttributeChart() {
  const series = [
    { key: "La Pura", color: "#0091FF", values: [30, 40, 48, 77, 76, 24, 30, 12] },
    { key: "TB cùng phân khúc", color: "#FFC93C", values: [26, 22, 30, 60, 58, 30, 28, 8] },
  ];
  const data = AQUA_ASPECTS.map((label, index) => ({
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
