"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import type { ListWorkspaceKeysResult } from "@/lib/unkey/types";
import { workspaceFetch } from "@/lib/workspaces/utils/workspace-fetch";

export const workspaceKeysQueryKey = (workspaceId: string) =>
  ["workspace-api-keys", workspaceId] as const;

async function fetchKeys(workspaceId: string): Promise<ListWorkspaceKeysResult> {
  const res = await workspaceFetch(workspaceId, "/api/workspace-keys");
  const data = (await res.json()) as ListWorkspaceKeysResult & {
    error?: string;
    message?: string;
  };
  if (!res.ok) throw new Error(data.message ?? data.error ?? "Could not load API keys.");
  return data;
}

/** API keys of a workspace (D27), shared by workspace settings and the "Kết nối AI" page. */
export function useWorkspaceKeys(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: workspaceKeysQueryKey(workspaceId ?? "pending"),
    queryFn: () => fetchKeys(workspaceId!),
    enabled: Boolean(workspaceId),
  });

  return {
    ...query,
    keys: query.data?.items ?? [],
    refresh: () =>
      queryClient.invalidateQueries({ queryKey: workspaceKeysQueryKey(workspaceId ?? "pending") }),
  };
}
