export const jobsQueryKey = (workspaceId: string, jobType: string) =>
  ["jobs", workspaceId, jobType] as const;

export const jobRunsQueryKey = (workspaceId: string, jobId: string) =>
  ["job-runs", workspaceId, jobId] as const;
