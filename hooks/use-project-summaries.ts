"use client";

import { useQuery } from "@tanstack/react-query";

import type { ListProjectSummariesResult } from "@/lib/projects/types";
import { workspaceFetch } from "@/lib/workspaces/utils/workspace-fetch";

export const projectSummariesQueryKey = (workspaceId: string) =>
  ["projects", workspaceId, "summaries"] as const;

async function fetchProjectSummaries(
  workspaceId: string,
): Promise<ListProjectSummariesResult> {
  const res = await workspaceFetch(workspaceId, "/api/projects/summaries");
  const data = (await res.json()) as ListProjectSummariesResult & {
    error?: string;
    message?: string;
  };

  if (!res.ok) {
    throw new Error(data.message ?? data.error ?? "Could not load projects.");
  }

  return data;
}

export function useProjectSummaries(workspaceId: string | undefined) {
  return useQuery({
    queryKey: projectSummariesQueryKey(workspaceId ?? "pending"),
    queryFn: () => fetchProjectSummaries(workspaceId!),
    enabled: Boolean(workspaceId),
  });
}
