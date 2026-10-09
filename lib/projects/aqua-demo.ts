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
  AREAS: {
    n: string;
    c: number;
    r: number;
    h?: number;
    m: number;
    g: number;
    s: number;
    p: number;
    t: string;
  }[];
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

export type AquaArea = {
  name: string;
  column: number;
  row: number;
  rowSpan: number;
  mentions: number;
  growth: number;
  nss: number;
  price: number;
  topic: string;
};

export const AQUA_AREAS: AquaArea[] = raw.AREAS.map((area) => ({
  name: area.n,
  column: area.c,
  row: area.r,
  rowSpan: area.h ?? 1,
  mentions: area.m,
  growth: area.g,
  nss: area.s,
  price: area.p,
  topic: area.t,
}));

export const AQUA_BRAND_NAMES = ["Phát Đạt", "Becamex IDC", "Kim Oanh Group", "Bcons"] as const;
export const AQUA_BRAND_SHARE = [31, 29, 22, 18] as const;
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

function mapCase(id: AquaCaseId, item: RawCase): AquaCase {
  const kpis = item.kpis.map((row) => ({
    label: row[0],
    value: row[1],
    delta: row[2],
    good: row[3] === 1,
    tip: row[4],
  }));

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
  return /mục tiêu|Hạng|TB|chuẩn|so với|Mới|nhiệt|Chưa|nghi vấn|sàn|ngày/.test(delta);
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
      hour <= 16
        ? 6 + 94 * (hour / 16) ** 2
        : Math.max(38, 100 - (hour - 16) * 2.4);
    const stamp = new Date(2026, 8, 23, 18 + hour);
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
