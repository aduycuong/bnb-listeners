import type { AvailableProjectCase } from "./project-cases";

/**
 * threshold: a metric crosses a fixed value.
 * growth: a metric grows by a percentage against the previous window.
 */
export const ALERT_RULE_TYPES = ["threshold", "growth"] as const;

export type AlertRuleType = (typeof ALERT_RULE_TYPES)[number];

export type AlertRuleTemplate = {
  key: string;
  type: AlertRuleType;
  label: string;
  unit: string;
  defaultThreshold: number;
  /** Fixed rule inputs read by the evaluator in phase 6 (window, aspects, keywords…). */
  params: Record<string, unknown>;
  /** Case field the rule needs, e.g. the reference price. */
  requiresConfig?: string;
};

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

/** Suggested alert rules per case. Evaluated from phase 6 (docs/plan.md). */
export const ALERT_TEMPLATES: Record<AvailableProjectCase, AlertRuleTemplate[]> = {
  project: [
    {
      key: "price_deviation",
      type: "threshold",
      label: "Giá được nhắc lệch giá tham chiếu quá",
      unit: "%",
      defaultThreshold: 15,
      params: { window: "24h" },
      requiresConfig: "priceRef",
    },
    {
      key: "negative_aspect_share",
      type: "threshold",
      label: "Tiêu cực về pháp lý, tiến độ vượt",
      unit: "% thảo luận trong 24 giờ",
      defaultThreshold: 30,
      params: { window: "24h", aspectKeys: ["legal", "progress"] },
    },
    {
      key: "buyer_questions_growth",
      type: "growth",
      label: "Câu hỏi của người mua tăng",
      unit: "% so với tuần trước",
      defaultThreshold: 30,
      params: { window: "7d" },
    },
    {
      key: "viral_post",
      type: "threshold",
      label: "Một bài nhắc tới dự án đạt",
      unit: "lượt tương tác",
      defaultThreshold: 500,
      params: { metric: "engagement" },
    },
  ],
  market: [
    {
      key: "area_discussion_growth",
      type: "growth",
      label: "Thảo luận về một khu vực tăng",
      unit: "% so với tuần trước",
      defaultThreshold: 30,
      params: { window: "7d" },
    },
    {
      key: "zoning_rumor_spread",
      type: "threshold",
      label: "Tin chưa kiểm chứng về quy hoạch xuất hiện ở",
      unit: "nguồn trong 24 giờ",
      defaultThreshold: 3,
      params: { window: "24h", aspectKeys: ["infrastructure"] },
    },
    {
      key: "distress_keywords_growth",
      type: "growth",
      label: "Từ khóa cắt lỗ, bán gấp tăng",
      unit: "% so với tuần trước",
      defaultThreshold: 20,
      params: { window: "7d", keywords: ["cắt lỗ", "bán gấp", "ngộp", "giảm sâu"] },
    },
    {
      key: "financing_concern_share",
      type: "threshold",
      label: "Lo ngại về lãi suất, khoản vay vượt",
      unit: "% thảo luận trong tuần",
      defaultThreshold: 30,
      params: { window: "7d", aspectKeys: ["financing"] },
    },
  ],
  brand: [
    {
      key: "negative_share",
      type: "threshold",
      label: "Tỷ lệ tiêu cực về chủ đầu tư vượt",
      unit: "% trong 24 giờ",
      defaultThreshold: 20,
      params: { window: "24h" },
    },
    {
      key: "sensitive_keywords",
      type: "threshold",
      label: "Bài nhắc tên kèm từ nhạy cảm, từ",
      unit: "bài trong 24 giờ",
      defaultThreshold: 1,
      params: {
        window: "24h",
        keywords: ["lừa đảo", "khởi tố", "thanh tra", "vỡ nợ", "chậm bàn giao"],
      },
    },
    {
      key: "finance_discussion_growth",
      type: "growth",
      label: "Thảo luận về tài chính, trái phiếu tăng",
      unit: "% trong 24 giờ",
      defaultThreshold: 30,
      params: { window: "24h", aspectKeys: ["finance"] },
    },
    {
      key: "viral_post",
      type: "threshold",
      label: "Một bài nhắc tới chủ đầu tư đạt",
      unit: "lượt tương tác",
      defaultThreshold: 500,
      params: { metric: "engagement" },
    },
  ],
};
