"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import type {
  ListWorkspacesForUserResult,
  WorkspaceListItem,
} from "@/lib/workspaces/types";
import {
  clampWorkspaceIndex,
  parseWorkspaceIndexParam,
} from "@/lib/workspaces/utils/parse-workspace-index-param";

export const workspacesQueryKey = ["workspaces"];

export type UseWorkspaceRouteContextResult = {
  workspace: WorkspaceListItem | null;
  workspaces: WorkspaceListItem[];
  workspaceIndex: number;
  isLoading: boolean;
  error: Error | null;
};

async function fetchWorkspaces(): Promise<ListWorkspacesForUserResult> {
  const res = await fetch("/api/workspaces");
  const data = (await res.json()) as ListWorkspacesForUserResult & {
    error?: string;
    message?: string;
  };

  if (!res.ok) {
    throw new Error(data.message ?? data.error ?? "Could not load workspaces.");
  }

  return data;
}

export function useWorkspaceRouteContext(
  workspaceIndexParam: string,
): UseWorkspaceRouteContextResult {
  const router = useRouter();
  const { data, isLoading, error } = useQuery({
    queryKey: workspacesQueryKey,
    queryFn: fetchWorkspaces,
  });

  const workspaces = data?.items ?? [];
  const parsedIndex = parseWorkspaceIndexParam(workspaceIndexParam);
  const workspaceIndex =
    parsedIndex === null
      ? 0
      : clampWorkspaceIndex(parsedIndex, workspaces.length);

  const hasNoWorkspaces = data !== undefined && workspaces.length === 0;
  const needsIndexRedirect =
    workspaces.length > 0 &&
    (parsedIndex === null || parsedIndex !== workspaceIndex);

  useEffect(() => {
    if (hasNoWorkspaces) {
      router.replace("/sign-in");
      return;
    }

    if (needsIndexRedirect) {
      router.replace(`/w/${workspaceIndex}`);
    }
  }, [hasNoWorkspaces, needsIndexRedirect, workspaceIndex, router]);

  return {
    // Withheld while a redirect is pending so callers never render the wrong workspace.
    workspace: needsIndexRedirect ? null : (workspaces[workspaceIndex] ?? null),
    workspaces,
    workspaceIndex,
    isLoading,
    error,
  };
}
