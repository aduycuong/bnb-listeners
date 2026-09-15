"use client";

import { useQuery } from "@tanstack/react-query";

import { DataSourceMenuFormPage } from "@/components/data-sources/data-source-menu-form-page";
import { DataSourceMenuListPage } from "@/components/data-sources/data-source-menu-list-page";
import { useWorkspaceRouteContext } from "@/hooks/use-workspace-route-context";
import type { DataSource } from "@/db/schema";
import {
  getDataSourceMenuConfig,
  type DataSourceMenuKey,
} from "@/lib/data-sources/data-source-menu-config";
import { workspaceFetch } from "@/lib/workspaces/utils/workspace-fetch";

type DataSourceMenuRouteProps = {
  jobMenuKey: DataSourceMenuKey;
  workspaceIndexParam: string;
};

export function DataSourceMenuListRoutePage({
  jobMenuKey,
  workspaceIndexParam,
}: DataSourceMenuRouteProps) {
  const menu = getDataSourceMenuConfig(jobMenuKey);
  const { workspace, workspaceIndex } =
    useWorkspaceRouteContext(workspaceIndexParam);

  if (!workspace) {
    return null;
  }

  return (
    <DataSourceMenuListPage
      menu={menu}
      workspace={workspace}
      workspaceIndex={workspaceIndex}
    />
  );
}

export function DataSourceMenuNewRoutePage({
  jobMenuKey,
  workspaceIndexParam,
}: DataSourceMenuRouteProps) {
  const menu = getDataSourceMenuConfig(jobMenuKey);
  const { workspace, workspaceIndex } =
    useWorkspaceRouteContext(workspaceIndexParam);

  if (!workspace) {
    return null;
  }

  if (workspace.permission === "read") {
    return (
      <div className="flex h-full items-center justify-center px-4 text-sm text-muted-foreground">
        You need edit access to create dataSources.
      </div>
    );
  }

  return (
    <DataSourceMenuFormPage
      menu={menu}
      workspace={workspace}
      workspaceIndex={workspaceIndex}
      mode="create"
    />
  );
}

type DataSourceMenuEditRoutePageProps = DataSourceMenuRouteProps & {
  dataSourceId: string;
};

async function fetchDataSource(
  workspaceId: string,
  dataSourceId: string,
): Promise<DataSource> {
  const res = await workspaceFetch(workspaceId, `/api/data-sources/${dataSourceId}`);
  const data = (await res.json()) as DataSource & {
    error?: string;
    message?: string;
  };

  if (!res.ok) {
    throw new Error(data.message ?? data.error ?? "Could not load dataSource.");
  }

  return data;
}

export function DataSourceMenuEditRoutePage({
  jobMenuKey,
  workspaceIndexParam,
  dataSourceId,
}: DataSourceMenuEditRoutePageProps) {
  const menu = getDataSourceMenuConfig(jobMenuKey);
  const { workspace, workspaceIndex } =
    useWorkspaceRouteContext(workspaceIndexParam);

  const { data: dataSource, isLoading, error } = useQuery({
    queryKey: ["job", workspace?.id, dataSourceId],
    queryFn: () => fetchDataSource(workspace!.id, dataSourceId),
    enabled: !!workspace,
  });

  if (!workspace) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center px-4 text-sm text-muted-foreground">
        Loading job…
      </div>
    );
  }

  if (error || !dataSource) {
    return (
      <div className="flex h-full items-center justify-center px-4 text-sm text-destructive">
        {error?.message ?? "Job not found."}
      </div>
    );
  }

  if (dataSource.sourceType !== menu.sourceType) {
    return (
      <div className="flex h-full items-center justify-center px-4 text-sm text-destructive">
        This dataSource does not belong to {menu.label}.
      </div>
    );
  }

  return (
    <DataSourceMenuFormPage
      menu={menu}
      workspace={workspace}
      workspaceIndex={workspaceIndex}
      mode="edit"
      dataSource={dataSource}
    />
  );
}
