import type { EntityRole } from "./case-templates";
import type { AvailableProjectCase } from "./project-cases";

/** Kinds of alert rule a project can add. Evaluated hourly by `lib/alerts`; only email is sent. */
export const ALERT_RULE_KINDS = [
  "volume_growth",
  "negative_share",
  "viral_post",
  "keyword_hit",
  "price_deviation",
  "buyer_questions_growth",
] as const;

export type AlertRuleKind = (typeof ALERT_RULE_KINDS)[number];

export const ALERT_WINDOWS = ["1h", "24h", "7d"] as const;

export type AlertWindow = (typeof ALERT_WINDOWS)[number];

export const ALERT_WINDOW_LABELS: Record<AlertWindow, string> = {
  "1h": "1 giờ",
  "24h": "24 giờ",
  "7d": "7 ngày",
};

/**
 * What a rule looks at, encoded as a string in forms:
 * `project`, `entity:<id>`, `aspect:<id>`, `each_role:<role>` (every entity of a role).
 */
export type AlertScopeType = "project" | "entity" | "aspect" | "each_role";

export type AlertRuleKindDef = {
  kind: AlertRuleKind;
  label: string;
  description: string;
  /** Cases that can add this kind; `all` for every case. */
  cases: "all" | AvailableProjectCase[];
  scopes: AlertScopeType[];
  thresholdLabel: string;
  unit: string;
  defaultThreshold: number;
  /** Null when the rule has no time window (e.g. one viral post). */
  defaultWindow: AlertWindow | null;
  /** Ratio and growth rules skip windows with fewer mentions than this. */
  defaultMinMentions: number | null;
  usesKeywords: boolean;
  /** Case field the rule needs, e.g. the reference price. */
  requiresConfig?: string;
};

export const ALERT_RULE_KIND_DEFS: Record<AlertRuleKind, AlertRuleKindDef> = {
  volume_growth: {
    kind: "volume_growth",
    label: "Lượng thảo luận tăng",
    description: "So với khoảng thời gian liền trước",
    cases: "all",
    scopes: ["project", "entity", "aspect", "each_role"],
    thresholdLabel: "Tăng từ",
    unit: "%",
    defaultThreshold: 30,
    defaultWindow: "7d",
    defaultMinMentions: 20,
    usesKeywords: false,
  },
  negative_share: {
    kind: "negative_share",
    label: "Tỷ lệ tiêu cực vượt",
    description: "Tỷ lệ mention tiêu cực trong khoảng thời gian",
    cases: "all",
    scopes: ["project", "entity", "aspect", "each_role"],
    thresholdLabel: "Vượt",
    unit: "%",
    defaultThreshold: 30,
    defaultWindow: "24h",
    defaultMinMentions: 20,
    usesKeywords: false,
  },
  viral_post: {
    kind: "viral_post",
    label: "Một bài lan rộng",
    description: "Một bài trong phạm vi đạt số lượt tương tác",
    cases: "all",
    scopes: ["project", "entity", "aspect", "each_role"],
    thresholdLabel: "Đạt",
    unit: "lượt tương tác",
    defaultThreshold: 500,
    defaultWindow: null,
    defaultMinMentions: null,
    usesKeywords: false,
  },
  keyword_hit: {
    kind: "keyword_hit",
    label: "Từ khóa xuất hiện",
    description: "Mention có chứa một trong các từ",
    cases: "all",
    scopes: ["project", "entity", "aspect", "each_role"],
    thresholdLabel: "Từ",
    unit: "bài",
    defaultThreshold: 1,
    defaultWindow: "24h",
    defaultMinMentions: null,
    usesKeywords: true,
  },
  price_deviation: {
    kind: "price_deviation",
    label: "Giá được nhắc lệch giá tham chiếu",
    description: "Cần giá tham chiếu và bước trích xuất giá",
    cases: ["project"],
    scopes: ["project"],
    thresholdLabel: "Lệch quá",
    unit: "%",
    defaultThreshold: 15,
    defaultWindow: "24h",
    defaultMinMentions: null,
    usesKeywords: false,
    requiresConfig: "priceRef",
  },
  buyer_questions_growth: {
    kind: "buyer_questions_growth",
    label: "Câu hỏi của người mua tăng",
    description: "Cần bước nhận diện câu hỏi người mua",
    cases: ["project"],
    scopes: ["project", "entity"],
    thresholdLabel: "Tăng từ",
    unit: "%",
    defaultThreshold: 30,
    defaultWindow: "7d",
    defaultMinMentions: 10,
    usesKeywords: false,
  },
};

export function alertKindsForCase(projectCase: AvailableProjectCase): AlertRuleKindDef[] {
  return ALERT_RULE_KINDS.map((kind) => ALERT_RULE_KIND_DEFS[kind]).filter(
    (def) => def.cases === "all" || def.cases.includes(projectCase),
  );
}

/** Starter rule; scope refers to template aspect keys and entity roles, resolved to ids in the form. */
export type AlertRuleSeed = {
  kind: AlertRuleKind;
  scope:
    | { type: "project" }
    | { type: "first_of_role"; role: EntityRole }
    | { type: "aspect_key"; key: string }
    | { type: "each_role"; role: EntityRole };
  enabled?: boolean;
  threshold?: number;
  window?: AlertWindow;
  keywords?: string[];
};

export const MAX_ALERT_RULES = 20;

export const NOTIFICATION_CHANNELS = ["email", "zalo", "sms", "slack"] as const;

export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const NOTIFICATION_CHANNEL_LABELS: Record<NotificationChannel, string> = {
  email: "Email",
  zalo: "Zalo",
  sms: "SMS",
  slack: "Slack",
};

export const REPORT_SCHEDULES = ["none", "daily", "weekly", "monthly"] as const;

export type ReportSchedule = (typeof REPORT_SCHEDULES)[number];

export const REPORT_SCHEDULE_LABELS: Record<ReportSchedule, string> = {
  none: "Không gửi",
  daily: "Hằng ngày, 8:00",
  weekly: "Thứ Hai hằng tuần, 8:00",
  monthly: "Ngày 1 hằng tháng, 8:00",
};
