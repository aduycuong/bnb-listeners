import rawJson from "./aqua-demo-cases.json";
import type { ProjectCase } from "./project-cases";

export const AQUA_CASE_IDS = [
  "general",
  "campaign",
  "crisis",
  "competitor",
  "cx",
] as const;

export type AquaCaseId = (typeof AQUA_CASE_IDS)[number];

export type AquaSentiment = "pos" | "neu" | "neg";
export type AquaAlertLevel = "high" | "med" | "low";

export type AquaKpi = {
  label: string;
  value: string;
  delta: string;
  good: boolean;
  tip: string;
};

export type AquaTopic = {
  name: string;
  mentions: number;
  growth: number;
  positive: number;
  negative: number;
};

export type AquaMention = {
  author: string;
  role: string;
  channel: string;
  time: string;
  text: string;
  topic: string;
  reach: number;
  engagement: number;
  sentiment: AquaSentiment;
};

export type AquaInsight = {
  emoji: string;
  headline: string;
  body: string;
};

export type AquaAlert = {
  level: AquaAlertLevel;
  title: string;
  body: string;
  time: string;
  status: string;
};

export type AquaTrend = {
  pos: number[];
  neu: number[];
  neg: number[];
};

export type AquaCase = {
  id: AquaCaseId;
  tab: string;
  badge: string;
  icon: string;
  title: string;
  desc: string;
  users: string;
  freq: string;
  special: string;
  kpis: AquaKpi[];
  trend: AquaTrend;
  brands: Record<string, number[]> | null;
  events: { date: string; label: string }[];
  channels: number[];
  topics: AquaTopic[];
  emos: number[];
  aspects: { positive: number; negative: number }[];
  ai: AquaInsight[];
  alerts: AquaAlert[];
  report: { sum: string; risks: string[]; recs: string[] };
  query: { main: string[]; with: string[]; ex: string[] };
  mentions: AquaMention[];
};

type RawCase = {
  tab: string;
  badge: string;
  icon: string;
  title: string;
  desc: string;
  users: string;
  freq: string;
  special: string;
  kpis: [string, string, string, number, string][];
  trend: AquaTrend;
  brands?: Record<string, number[]>;
  events: [string, string][];
  channels: number[];
  topics: [string, number, number, number, number][];
  emos: number[];
  aspects: [number, number][];
  ai: [string, string, string][];
  alerts: [string, string, string, string, string][];
  report: { sum: string; risks: string[]; recs: string[] };
  query: { main: string[]; with: string[]; ex: string[] };
  mentions?: [string, string, string, string, string, string, number, number, string][];
};

const raw = rawJson as unknown as {
  DAYS: string[];
  CH: string[];
  CHC: string[];
  ASPECTS: string[];
  EMOS: string[];
  AUTHORS: [string, string, string, number, string, AquaSentiment, string][];
  SOURCES: [string, string, number, string][];
  CASES: Record<AquaCaseId, RawCase>;
};

export const AQUA_DAYS = raw.DAYS;
export const AQUA_CHANNELS = raw.CH;
export const AQUA_CHANNEL_COLORS = raw.CHC;
export const AQUA_ASPECTS = raw.ASPECTS;
export const AQUA_EMOTIONS = raw.EMOS;

export const AQUA_AUTHORS = raw.AUTHORS.map((row) => ({
  name: row[0],
  platform: row[1],
  followers: row[2],
  posts: row[3],
  engagement: row[4],
  sentiment: row[5],
  tier: row[6],
}));

export const AQUA_SOURCES = raw.SOURCES.map((row) => ({
  name: row[0],
  type: row[1],
  posts: row[2],
  reach: row[3],
}));

export const AQUA_BRAND_NAMES = ["Aqua", "Breeze", "Nami", "Coolo"] as const;
export const AQUA_BRAND_COLORS = ["#0091FF", "#FFC93C", "#00C9A7", "#FF6B6B"] as const;

export const AQUA_SENTIMENT_LABEL: Record<AquaSentiment, string> = {
  pos: "Tích cực",
  neu: "Trung lập",
  neg: "Tiêu cực",
};

export const AQUA_ALERT_LABEL: Record<AquaAlertLevel, string> = {
  high: "Cao",
  med: "Trung bình",
  low: "Thấp",
};

const CAMPAIGN_ACTUAL = [21540, 3812, 8400000, 960000];
const CAMPAIGN_TARGET = [25000, 5000, 10000000, 1000000];

function mapCase(id: AquaCaseId, item: RawCase): AquaCase {
  const kpis = item.kpis.map((row, index) => {
    if (id !== "campaign" || index > 3) {
      return {
        label: row[0],
        value: row[1],
        delta: row[2],
        good: row[3] === 1,
        tip: row[4],
      };
    }

    const percent = Math.round((CAMPAIGN_ACTUAL[index] / CAMPAIGN_TARGET[index]) * 100);
    return {
      label: row[0],
      value: row[1],
      delta: `${percent}% mục tiêu`,
      good: percent >= 80,
      tip: row[4],
    };
  });

  return {
    id,
    tab: item.tab,
    badge: item.badge,
    icon: item.icon,
    title: item.title,
    desc: item.desc,
    users: item.users,
    freq: item.freq,
    special: item.special,
    kpis,
    trend: item.trend,
    brands: item.brands ?? null,
    events: item.events.map(([date, label]) => ({ date, label })),
    channels: item.channels,
    topics: item.topics.map((row) => ({
      name: row[0],
      mentions: row[1],
      growth: row[2],
      positive: row[3],
      negative: row[4],
    })),
    emos: item.emos,
    aspects: item.aspects.map(([positive, negative]) => ({ positive, negative })),
    ai: item.ai.map(([emoji, headline, body]) => ({ emoji, headline, body })),
    alerts: item.alerts.map((row) => ({
      level: row[0] as AquaAlertLevel,
      title: row[1],
      body: row[2],
      time: row[3],
      status: row[4],
    })),
    report: item.report,
    query: item.query,
    mentions: (item.mentions ?? []).map((row) => ({
      author: row[0],
      role: row[1],
      channel: row[2],
      time: row[3],
      text: row[4],
      topic: row[5],
      reach: row[6],
      engagement: row[7],
      sentiment: row[8] as AquaSentiment,
    })),
  };
}

export const AQUA_CASES: Record<AquaCaseId, AquaCase> = {
  general: mapCase("general", raw.CASES.general),
  campaign: mapCase("campaign", raw.CASES.campaign),
  crisis: mapCase("crisis", raw.CASES.crisis),
  competitor: mapCase("competitor", raw.CASES.competitor),
  cx: mapCase("cx", raw.CASES.cx),
};

export function isAquaCase(value: ProjectCase): value is AquaCaseId {
  return (AQUA_CASE_IDS as readonly string[]).includes(value);
}

export function getAquaCase(value: ProjectCase): AquaCase | null {
  if (!isAquaCase(value)) {
    return null;
  }

  return AQUA_CASES[value];
}

export function formatCount(value: number) {
  return value.toLocaleString("vi-VN");
}

export function formatShort(value: number) {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1).replace(".", ",")} tr`;
  }

  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1).replace(".", ",")}K`;
  }

  return String(value);
}

export function kpiHasOwnCompare(delta: string) {
  return /mục tiêu|Hạng|TB|chuẩn|so với|Mới|nhiệt|Chưa/.test(delta);
}

export function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

export function sentTotals(trend: AquaTrend) {
  const pos = sum(trend.pos);
  const neu = sum(trend.neu);
  const neg = sum(trend.neg);
  const total = pos + neu + neg;
  const nss = total ? Math.round(((pos - neg) / total) * 100) : 0;
  const negativeShare = total
    ? ((neg / total) * 100).toFixed(1).replace(".", ",")
    : "0";

  return { pos, neu, neg, total, nss, negativeShare };
}

export function nssByDay(trend: AquaTrend) {
  return trend.pos.map((positive, index) => {
    const total = positive + trend.neu[index] + trend.neg[index];
    if (!total) {
      return 0;
    }

    return Math.round(((positive - trend.neg[index]) / total) * 100);
  });
}

export function formatSigned(value: number, suffix = "") {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value}${suffix}`;
}

export const CAMPAIGN_PHASE_LABELS = [
  "Teaser (18/9–21/9)",
  "Kích hoạt (22/9–26/9)",
  "Lan tỏa (27/9–10/10)",
];

export const CAMPAIGN_PROGRESS = [
  { label: "Lượt đề cập", actual: 21540, target: 25000 },
  { label: "Nội dung UGC", actual: 3812, target: 5000 },
  { label: "Tiếp cận", actual: 8400000, target: 10000000 },
  { label: "Tương tác", actual: 960000, target: 1000000 },
] as const;

export function channelSentiment(caseId: AquaCaseId) {
  const negBase = caseId === "crisis" ? 38 : caseId === "cx" ? 18 : 8;
  const positiveBase = [64, 70, 60, 48, 44, 76, 68];
  const neutral = [26, 22, 32, 46, 30, 18, 14];
  const negativeBase = [10, 8, 8, 6, 26, 6, 18];

  return AQUA_CHANNELS.map((channel, index) => ({
    channel,
    positive: positiveBase[index] - negBase / 2,
    neutral: neutral[index],
    negative: Math.min(60, negativeBase[index] + negBase / 2),
  }));
}

export function discussionHeat(caseId: string) {
  let seed = caseId.length * 97;
  const next = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  const days = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
  return days.map((day, dayIndex) =>
    Array.from({ length: 24 }, (_, hour) => {
      const base =
        hour < 6
          ? 0.05
          : hour < 11
            ? 0.35
            : hour < 14
              ? 0.6
              : hour < 19
                ? 0.45
                : hour < 23
                  ? 0.9
                  : 0.3;
      const value = Math.min(
        1,
        base * (dayIndex >= 5 ? 1.15 : 1) * (0.75 + next() * 0.5),
      );
      return {
        day,
        hour,
        alpha: 0.06 + value * 0.94,
        count: Math.round(value * 420),
      };
    }),
  );
}

export function crisisVelocity() {
  return Array.from({ length: 48 }, (_, hour) => {
    const raw =
      hour < 9
        ? 3 + (hour % 3)
        : hour < 14
          ? 10 + (hour - 9) * 8
          : hour < 23
            ? 50 + (hour - 14) * 15
            : hour < 30
              ? 186 - (hour - 23) * 9
              : Math.max(74, 123 - (hour - 30) * 3.5);
    const stamp = new Date(2026, 8, 29, 12 + hour);
    return {
      label: `${stamp.getHours()}h`,
      value: Math.round(raw),
    };
  });
}

export const AQUA_PAGE_META: Record<
  | "overview"
  | "mentions"
  | "sentiment"
  | "topics"
  | "channels"
  | "authors"
  | "alerts"
  | "report"
  | "settings",
  { title: string; subtitle: string }
> = {
  overview: {
    title: "Tổng quan",
    subtitle: "Trang dùng chung cho mọi kiểu case · Cập nhật 2 phút trước",
  },
  mentions: {
    title: "Luồng thảo luận",
    subtitle: "Trang dùng chung cho mọi kiểu case · Cập nhật 2 phút trước",
  },
  sentiment: {
    title: "Cảm xúc",
    subtitle: "Trang dùng chung cho mọi kiểu case · Cập nhật 2 phút trước",
  },
  topics: {
    title: "Chủ đề & từ khóa",
    subtitle: "Trang dùng chung cho mọi kiểu case · Cập nhật 2 phút trước",
  },
  channels: {
    title: "Kênh & nguồn",
    subtitle: "Trang dùng chung cho mọi kiểu case · Cập nhật 2 phút trước",
  },
  authors: {
    title: "KOL & tác giả",
    subtitle: "Trang dùng chung cho mọi kiểu case · Cập nhật 2 phút trước",
  },
  alerts: {
    title: "Cảnh báo",
    subtitle: "Trang dùng chung cho mọi kiểu case · Cập nhật 2 phút trước",
  },
  report: {
    title: "Báo cáo AI",
    subtitle: "Trang dùng chung cho mọi kiểu case · Cập nhật 2 phút trước",
  },
  settings: {
    title: "Cài đặt dự án",
    subtitle: "Cấu hình của dự án đang chọn",
  },
};
