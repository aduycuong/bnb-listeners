"use client";

import { use } from "react";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { WorkspaceIndexPersist } from "@/components/workspace/workspace-index-persist";
import { useWorkspaceRouteContext } from "@/hooks/use-workspace-route-context";

type WorkspaceLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ workspaceIndex: string }>;
};

export default function WorkspaceLayout({
  children,
  params,
}: WorkspaceLayoutProps) {
  const { workspaceIndex: workspaceIndexParam } = use(params);
  const { workspace, workspaces, workspaceIndex, error } =
    useWorkspaceRouteContext(workspaceIndexParam);

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center text-xs text-destructive">
        {error.message}
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="flex h-screen items-center justify-center text-xs">
        Loading workspace...
      </div>
    );
  }

  return (
    <>
      <WorkspaceIndexPersist workspaceIndex={workspaceIndex} />
      <DashboardShell
        workspace={workspace}
        workspaces={workspaces}
        workspaceIndex={workspaceIndex}
      >
        {children}
      </DashboardShell>
    </>
  );
}
