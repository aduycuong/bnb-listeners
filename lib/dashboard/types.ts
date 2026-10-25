import type { ProjectCase } from "@/lib/projects/project-cases";

export type DashboardSentimentCounts = {
  positive: number;
  neutral: number;
  negative: number;
  /** Relevant mentions Enrich has not scored yet. */
  unknown: number;
};

export type DashboardDailyMentionsPoint = DashboardSentimentCounts & {
  dateKey: string;
};

export type DashboardProjectRow = {
  id: string;
  name: string;
  case: ProjectCase;
  /** Position in the workspace's project list, used by `/w/{i}/p/{j}` routes. */
  projectIndex: number;
  mentions: number;
  previousMentions: number;
  /** Net sentiment score, −100 to +100; null when no mention has a sentiment. */
  nss: number | null;
  /** Share of negative mentions among scored ones, in %; null when none are scored. */
  negativeShare: number | null;
  alerts: number;
};

export type DashboardRecentAlert = {
  id: string;
  projectId: string;
  projectName: string;
  projectIndex: number;
  kind: string;
  level: string;
  title: string;
  triggeredAt: string;
};

export type DashboardUsageItem = {
  used: number;
  /** null = unlimited. */
  limit: number | null;
};

export type DashboardUsage = {
  planName: string;
  projects: DashboardUsageItem;
  members: DashboardUsageItem;
  /** Distinct shared sources followed by the workspace's projects. */
  sources: DashboardUsageItem;
  /** Mentions an Enrich stage finished this calendar month. */
  analyzedMentions: DashboardUsageItem;
  apiKeys: DashboardUsageItem;
};

export type GetDashboardOverviewResult = {
  periodDays: number;
  timezone: string;
  totals: {
    projects: number;
    mentions: number;
    previousMentions: number;
    nss: number | null;
    previousNss: number | null;
    negativeShare: number | null;
    alerts: number;
  };
  daily: DashboardDailyMentionsPoint[];
  projects: DashboardProjectRow[];
  recentAlerts: DashboardRecentAlert[];
  usage: DashboardUsage;
};
