"use client";

import { useQuery } from "@tanstack/react-query";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { WorkspaceListPage } from "@/components/workspace/workspace-list-page";
import {
  fetchWorkspaces,
  workspacesQueryKey,
} from "@/hooks/use-workspace-route-context";

export function WorkspaceListRoutePage() {
  const workspacesQuery = useQuery({
    queryKey: workspacesQueryKey,
    queryFn: fetchWorkspaces,
  });

  const workspaces = workspacesQuery.data?.items ?? [];

  if (workspacesQuery.isLoading && !workspacesQuery.data) {
    return (
      <div className="flex h-screen items-center justify-center text-xs">
        Loading workspaces...
      </div>
    );
  }

  if (workspacesQuery.error) {
    return (
      <div className="flex h-screen items-center justify-center text-xs text-destructive">
        {workspacesQuery.error.message}
      </div>
    );
  }

  return (
    <DashboardShell mode="root" workspaces={workspaces}>
      <WorkspaceListPage />
    </DashboardShell>
  );
}
