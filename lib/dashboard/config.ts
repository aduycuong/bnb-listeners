/** Workspace Overview settings. */
export const DASHBOARD_CONFIG = {
  /** Days of the Overview, today included; changes compare with the same number of days before. */
  periodDays: 30,
  /** A workspace spans projects with different timezones, so day buckets use one zone. */
  timezone: "Asia/Ho_Chi_Minh",
  topProjects: 8,
  recentAlerts: 5,
} as const;

/**
 * Demo plan limits shown on the usage card. There is no billing or quota model yet, so these are
 * fixed here; `null` means unlimited. Replace with per-workspace limits when plans exist.
 */
export const DEMO_PLAN = {
  name: "Gói demo",
  limits: {
    projects: 10,
    members: 10,
    sources: 50,
    analyzedMentions: 50_000,
    apiKeys: 5,
  },
} as const;
