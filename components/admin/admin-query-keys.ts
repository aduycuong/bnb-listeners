export const authMeQueryKey = ["auth", "me"] as const;

export const adminQueryKeys = {
  overview: () => ["admin", "overview"] as const,
  sources: () => ["admin", "sources"] as const,
  source: (id: string) => ["admin", "sources", id] as const,
  contentItems: (filters: Record<string, string | number>) =>
    ["admin", "content-items", filters] as const,
  contentItem: (id: string) => ["admin", "content-items", "detail", id] as const,
  collectRuns: (filters: Record<string, string | number>) =>
    ["admin", "collect-runs", filters] as const,
  collectRun: (id: string) => ["admin", "collect-runs", "detail", id] as const,
  collectRunPayload: (id: string, offset: number) =>
    ["admin", "collect-runs", "payload", id, offset] as const,
  refreshSchedules: (filters: Record<string, string | number>) =>
    ["admin", "refresh-schedules", filters] as const,
  scheduler: () => ["admin", "scheduler"] as const,
  workflowRuns: (workflow: string) => ["admin", "workflow-runs", workflow] as const,
};
