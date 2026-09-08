export const workspaceLlmPromptsQueryKey = (workspaceId: string) =>
  ["workspace", workspaceId, "llm-prompts"] as const;
