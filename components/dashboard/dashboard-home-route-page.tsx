"use client";

import { DashboardHome } from "@/components/dashboard/dashboard-home";
import { useWorkspaceRouteContext } from "@/hooks/use-workspace-route-context";

type DashboardHomeRoutePageProps = {
  workspaceIndexParam: string;
};

export function DashboardHomeRoutePage({
  workspaceIndexParam,
}: DashboardHomeRoutePageProps) {
  const { workspace } = useWorkspaceRouteContext(workspaceIndexParam);

  if (!workspace) {
    return null;
  }

  return <DashboardHome workspace={workspace} />;
}
