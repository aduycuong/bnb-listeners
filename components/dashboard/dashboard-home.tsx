"use client";

import { useQuery } from "@tanstack/react-query";

import { DashboardCounterCards } from "@/components/dashboard/dashboard-counter-cards";
import { DashboardIngestionChart } from "@/components/dashboard/dashboard-ingestion-chart";
import type { GetDashboardOverviewResult } from "@/lib/dashboard/types";
import type { WorkspaceListItem } from "@/lib/workspaces/types";
import { workspaceFetch } from "@/lib/workspaces/utils/workspace-fetch";

type DashboardHomeProps = {
  workspace: WorkspaceListItem;
};

async function fetchOverview(
  workspaceId: string,
): Promise<GetDashboardOverviewResult> {
  const res = await workspaceFetch(workspaceId, "/api/dashboard/overview");
  if (!res.ok) throw new Error("Failed to load overview");
  return res.json() as Promise<GetDashboardOverviewResult>;
}

export function DashboardHome({ workspace }: DashboardHomeProps) {
  const overviewQuery = useQuery({
    queryKey: ["dashboard", "overview", workspace.id],
    queryFn: () => fetchOverview(workspace.id),
  });

  return (
    <div className="flex min-h-full flex-1 flex-col gap-6 p-6 md:p-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {workspace.name} · document pipeline summary
        </p>
      </div>

      <DashboardCounterCards
        data={overviewQuery.data}
        isLoading={overviewQuery.isLoading}
      />

      <DashboardIngestionChart
        data={overviewQuery.data}
        isLoading={overviewQuery.isLoading}
      />
    </div>
  );
}
