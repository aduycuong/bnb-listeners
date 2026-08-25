"use client";

import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useT } from "next-i18next/client";
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
  const { t } = useT("dashboard");

  return (
    <SidebarProvider defaultOpen>
      <DashboardSidebar
        workspace={workspace}
        workspaces={workspaces}
        workspaceIndex={workspaceIndex}
      />
      <SidebarInset className="bg-background">
        <div className="flex h-svh flex-col overflow-hidden">
          <div className="flex items-center gap-2 border-b border-border px-4 py-2 md:hidden">
            <SidebarTrigger />
            <span className="text-sm font-medium">{t("appName")}</span>
          </div>
          <div className="flex-1 overflow-y-auto">{children}</div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
