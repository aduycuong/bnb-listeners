export function researchRunsQueryKey(workspaceId: string) {
  return ["research-runs", workspaceId] as const;
}

export function researchRunQueryKey(workspaceId: string, runId: string) {
  return ["research-run", workspaceId, runId] as const;
}
