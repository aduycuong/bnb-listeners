"use client";

import { useQuery } from "@tanstack/react-query";

import { DashboardCounterCards } from "@/components/dashboard/dashboard-counter-cards";
import { DashboardIngestionChart } from "@/components/dashboard/dashboard-ingestion-chart";
import { DashboardTermGroupSection } from "@/components/dashboard/dashboard-term-group-section";
import type { GetDashboardOverviewResult } from "@/lib/dashboard/types";
import type { GetDashboardTermGroupsResult } from "@/lib/dashboard/types";
import type { WorkspaceListItem } from "@/lib/workspaces/types";
import { workspaceFetch } from "@/lib/workspaces/utils/workspace-fetch";

type DashboardHomeProps = {
  workspace: WorkspaceListItem;
  workspaceIndex: number;
};

async function fetchOverview(
  workspaceId: string,
): Promise<GetDashboardOverviewResult> {
  const res = await workspaceFetch(workspaceId, "/api/dashboard/overview");
  if (!res.ok) throw new Error("Failed to load overview");
  return res.json() as Promise<GetDashboardOverviewResult>;
}

async function fetchTermGroups(
  workspaceId: string,
): Promise<GetDashboardTermGroupsResult> {
  const res = await workspaceFetch(workspaceId, "/api/dashboard/term-groups");
  if (!res.ok) throw new Error("Failed to load term groups");
  return res.json() as Promise<GetDashboardTermGroupsResult>;
}

export function DashboardHome({ workspace, workspaceIndex }: DashboardHomeProps) {
  const overviewQuery = useQuery({
    queryKey: ["dashboard", "overview", workspace.id],
    queryFn: () => fetchOverview(workspace.id),
  });

  const termGroupsQuery = useQuery({
    queryKey: ["dashboard", "term-groups", workspace.id],
    queryFn: () => fetchTermGroups(workspace.id),
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

      <div className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Trending keywords by group · last 30 days
        </h2>
        <DashboardTermGroupSection
          data={termGroupsQuery.data}
          isLoading={termGroupsQuery.isLoading}
          workspaceIndex={workspaceIndex}
        />
      </div>
    </div>
  );
}
