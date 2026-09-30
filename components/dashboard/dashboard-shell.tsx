"use client";

import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import type { WorkspaceListItem } from "@/lib/workspaces/types";

type DashboardShellProps = {
  children: React.ReactNode;
  workspace: WorkspaceListItem;
  workspaces: WorkspaceListItem[];
  workspaceIndex: number;
};

export function DashboardShell({
  children,
  workspace,
  workspaces,
  workspaceIndex,
}: DashboardShellProps) {
  return (
    <SidebarProvider defaultOpen>
      <DashboardSidebar
        workspace={workspace}
        workspaces={workspaces}
        workspaceIndex={workspaceIndex}
      />
      <SidebarInset className="bg-background">
        <div className="flex h-svh flex-col overflow-hidden">
          <DashboardHeader />
          <div className="flex-1 overflow-y-auto">{children}</div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
