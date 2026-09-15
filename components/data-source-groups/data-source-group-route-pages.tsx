"use client";

import { DataSourceGroupDetailPage } from "@/components/data-source-groups/data-source-group-detail-page";
import { DataSourceGroupListPage } from "@/components/data-source-groups/data-source-group-list-page";
import { useWorkspaceRouteContext } from "@/hooks/use-workspace-route-context";

type DataSourceGroupListRoutePageProps = {
  workspaceIndexParam: string;
};

export function DataSourceGroupListRoutePage({
  workspaceIndexParam,
}: DataSourceGroupListRoutePageProps) {
  const { workspace, workspaceIndex } =
    useWorkspaceRouteContext(workspaceIndexParam);

  if (!workspace) {
    return null;
  }

  return (
    <DataSourceGroupListPage
      workspace={workspace}
      workspaceIndex={workspaceIndex}
    />
  );
}

type DataSourceGroupDetailRoutePageProps = {
  workspaceIndexParam: string;
  groupId: string;
};

export function DataSourceGroupDetailRoutePage({
  workspaceIndexParam,
  groupId,
}: DataSourceGroupDetailRoutePageProps) {
  const { workspace, workspaceIndex } =
    useWorkspaceRouteContext(workspaceIndexParam);

  if (!workspace) {
    return null;
  }

  return (
    <DataSourceGroupDetailPage
      workspace={workspace}
      workspaceIndex={workspaceIndex}
      groupId={groupId}
    />
  );
}
