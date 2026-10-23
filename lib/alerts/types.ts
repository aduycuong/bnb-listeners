export type AlertLevel = "high" | "med" | "low";

export type AlertStatus = "open" | "emailed" | "email_failed";

export type AlertPayload = {
  scopeLabel: string;
  threshold: number;
  window: "1h" | "24h" | "7d" | null;
  current?: number;
  previous?: number;
  growth?: number | null;
  share?: number | null;
  deviation?: number | null;
  amount?: number;
  priceRef?: number;
  quoteCount?: number;
  engagement?: number;
  keywords?: string[];
};

export type AlertHit = {
  projectName: string;
  title: string;
  body: string;
  outcome: "dry_run" | "recorded" | "emailed" | "email_failed";
  emailError: string | null;
};

export type EvaluateAlertsParams = {
  dryRun: boolean;
  projectId?: string;
  now?: Date;
};

export type EvaluateAlertsResult = {
  projects: number;
  created: number;
  emailed: number;
  emailFailed: number;
  hits: AlertHit[];
};

export type ProjectAlertItem = {
  id: string;
  level: AlertLevel;
  title: string;
  body: string;
  status: AlertStatus;
  emailError: string | null;
  triggeredAt: string;
};

export type ProjectAlertRuleItem = {
  id: string;
  label: string;
  scope: string;
  threshold: string;
  window: string;
  deliversEmail: boolean;
};

export type ProjectAlertsResult = {
  alerts: ProjectAlertItem[];
  rules: ProjectAlertRuleItem[];
  recipientCount: number;
};
