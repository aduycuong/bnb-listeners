export const dataSourcesQueryKey = (workspaceId: string, sourceType: string) =>
  ["jobs", workspaceId, sourceType] as const;

export const sourceRunsQueryKey = (workspaceId: string, dataSourceId: string) =>
  ["job-runs", workspaceId, dataSourceId] as const;
