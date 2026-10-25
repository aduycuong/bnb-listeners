"use client";

import { useQuery } from "@tanstack/react-query";
import { useT } from "next-i18next/client";

import { DashboardKpiCards } from "@/components/dashboard/dashboard-kpi-cards";
import { DashboardMentionsChart } from "@/components/dashboard/dashboard-mentions-chart";
import { DashboardProjectsTable } from "@/components/dashboard/dashboard-projects-table";
import { DashboardRecentAlerts } from "@/components/dashboard/dashboard-recent-alerts";
import { DashboardUsageCard } from "@/components/dashboard/dashboard-usage-card";
import type { GetDashboardOverviewResult } from "@/lib/dashboard/types";
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

export function DashboardHome({ workspace, workspaceIndex }: DashboardHomeProps) {
  const { t } = useT("dashboard");
  const overviewQuery = useQuery({
    queryKey: ["dashboard", "overview", workspace.id],
    queryFn: () => fetchOverview(workspace.id),
  });
  const { data, isLoading, error } = overviewQuery;

  return (
    <div className="flex min-h-full flex-1 flex-col gap-6 p-6 md:p-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          {t("overview.title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("overview.subtitle", {
            workspace: workspace.name,
            days: data?.periodDays ?? 30,
          })}
        </p>
      </div>

      {error ? (
        <p className="text-sm text-destructive">{error.message}</p>
      ) : null}

      <DashboardKpiCards data={data} isLoading={isLoading} />

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <DashboardMentionsChart data={data} isLoading={isLoading} />
        </div>
        <DashboardUsageCard data={data} isLoading={isLoading} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <DashboardProjectsTable
            workspaceIndex={workspaceIndex}
            data={data}
            isLoading={isLoading}
          />
        </div>
        <DashboardRecentAlerts
          workspaceIndex={workspaceIndex}
          data={data}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
