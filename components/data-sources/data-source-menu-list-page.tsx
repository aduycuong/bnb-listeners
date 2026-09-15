"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { ResourceListPage } from "@/components/dashboard/resource-list-page";
import { dataSourcesQueryKey } from "@/components/data-sources/data-source-query-keys";
import { SourceRunButton } from "@/components/data-sources/source-run-button";
import { getCronFriendlyText } from "@/lib/common/cron-presets";
import {
  getDataSourceMenuHref,
  type DataSourceMenuConfig,
} from "@/lib/data-sources/data-source-menu-config";
import type { ListDataSourcesResult } from "@/lib/data-sources/types";
import type { WorkspaceListItem } from "@/lib/workspaces/types";
import { workspaceFetch } from "@/lib/workspaces/utils/workspace-fetch";

type DataSourceMenuListPageProps = {
  menu: DataSourceMenuConfig;
  workspace: WorkspaceListItem;
  workspaceIndex: number;
};

async function fetchJobs(
  workspaceId: string,
  sourceType: string,
): Promise<ListDataSourcesResult> {
  const res = await workspaceFetch(
    workspaceId,
    `/api/data-sources?sourceType=${encodeURIComponent(sourceType)}`,
  );
  const data = (await res.json()) as ListDataSourcesResult & {
    error?: string;
    message?: string;
  };

  if (!res.ok) {
    throw new Error(data.message ?? data.error ?? "Could not load dataSources.");
  }

  return data;
}

export function DataSourceMenuListPage({
  menu,
  workspace,
  workspaceIndex,
}: DataSourceMenuListPageProps) {
  const canEdit = workspace.permission !== "read";

  const { data, isLoading, error } = useQuery({
    queryKey: dataSourcesQueryKey(workspace.id, menu.sourceType),
    queryFn: () => fetchJobs(workspace.id, menu.sourceType),
  });

  const items = useMemo(() => {
    return (data?.items ?? []).map((dataSource) => {
      const scheduleText = dataSource.cronConfig.cron.trim()
        ? getCronFriendlyText(dataSource.cronConfig.cron)
        : "No schedule";

      return {
        id: dataSource.id,
        name: dataSource.name,
        description: scheduleText,
        date: dataSource.createdAt,
        badges: [
          dataSource.enabled
            ? {
                label: "Enabled",
                className:
                  "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
              }
            : { label: "Disabled", className: "bg-muted text-muted-foreground" },
        ],
      };
    });
  }, [data?.items]);

  return (
    <ResourceListPage
      title={menu.listTitle}
      description={menu.listDescription}
      items={items}
      emptyTitle={menu.emptyTitle}
      emptyDescription={
        canEdit ? menu.emptyDescription : `${menu.listTitle} jobs will appear here once they are added.`
      }
      createHref={
        canEdit ? getDataSourceMenuHref(workspaceIndex, menu, "new") : undefined
      }
      createLabel={menu.createLabel}
      isLoading={isLoading}
      errorMessage={error?.message}
      getItemHref={(item) => getDataSourceMenuHref(workspaceIndex, menu, item.id)}
      renderItemActions={
        canEdit
          ? (item) => (
              <SourceRunButton
                workspaceId={workspace.id}
                dataSourceId={item.id}
                ariaLabel={`Run ${item.name}`}
              />
            )
          : undefined
      }
    />
  );
}
