"use client";

import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import type { WorkspaceListItem } from "@/lib/workspaces/types";

type RootDashboardShellProps = {
  mode: "root";
  children: React.ReactNode;
  workspaces: WorkspaceListItem[];
};

type WorkspaceDashboardShellProps = {
  mode: "workspace";
  children: React.ReactNode;
  workspace: WorkspaceListItem;
  workspaces: WorkspaceListItem[];
  workspaceIndex: number;
};

export type DashboardShellProps =
  | RootDashboardShellProps
  | WorkspaceDashboardShellProps;

export function DashboardShell(props: DashboardShellProps) {
  return (
    <SidebarProvider defaultOpen>
      {props.mode === "root" ? (
        <DashboardSidebar mode="root" workspaces={props.workspaces} />
      ) : (
        <DashboardSidebar
          mode="workspace"
          workspace={props.workspace}
          workspaces={props.workspaces}
          workspaceIndex={props.workspaceIndex}
        />
      )}
      <SidebarInset className="bg-background">
        <div className="flex h-svh flex-col overflow-hidden">
          <DashboardHeader />
          <div className="flex-1 overflow-y-auto">{props.children}</div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
