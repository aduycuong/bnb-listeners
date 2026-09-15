"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LayersIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { ResourceListEmpty } from "@/components/dashboard/resource-list-empty";
import { DataSourceGroupDeleteDialog } from "@/components/data-source-groups/data-source-group-delete-dialog";
import { DataSourceGroupFormDialog } from "@/components/data-source-groups/data-source-group-form-dialog";
import { dataSourceGroupsQueryKey } from "@/components/data-source-groups/data-source-group-query-keys";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DATA_SOURCE_GROUP_CONFIG,
  getDataSourceGroupHref,
} from "@/lib/data-source-groups/data-source-group-config";
import type {
  DataSourceGroupListItem,
  ListDataSourceGroupsResult,
} from "@/lib/data-source-groups/types";
import type { WorkspaceListItem } from "@/lib/workspaces/types";
import { workspaceFetch } from "@/lib/workspaces/utils/workspace-fetch";

type DataSourceGroupListPageProps = {
  workspace: WorkspaceListItem;
  workspaceIndex: number;
};

async function fetchDataSourceGroups(
  workspaceId: string,
): Promise<ListDataSourceGroupsResult> {
  const res = await workspaceFetch(workspaceId, "/api/data-source-groups");
  const data = (await res.json()) as ListDataSourceGroupsResult & {
    error?: string;
    message?: string;
  };

  if (!res.ok) {
    throw new Error(
      data.message ?? data.error ?? "Could not load data source groups.",
    );
  }

  return data;
}

function DataSourceGroupRowSkeleton() {
  return <Skeleton className="h-24 w-full rounded-xl" />;
}

export function DataSourceGroupListPage({
  workspace,
  workspaceIndex,
}: DataSourceGroupListPageProps) {
  const canEdit = workspace.permission !== "read";
  const queryClient = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<
    Pick<DataSourceGroupListItem, "id" | "name" | "description"> | undefined
  >();
  const [deletingGroup, setDeletingGroup] = useState<
    Pick<DataSourceGroupListItem, "id" | "name"> | undefined
  >();

  const groupsQuery = useQuery({
    queryKey: dataSourceGroupsQueryKey(workspace.id),
    queryFn: () => fetchDataSourceGroups(workspace.id),
  });

  const groups = groupsQuery.data?.items ?? [];
  const isInitialLoading = groupsQuery.isLoading;
  const errorMessage = groupsQuery.error?.message;

  async function refreshGroups() {
    await queryClient.invalidateQueries({
      queryKey: dataSourceGroupsQueryKey(workspace.id),
    });
  }

  function openCreate() {
    setEditingGroup(undefined);
    setFormOpen(true);
  }

  function openEdit(group: DataSourceGroupListItem) {
    setEditingGroup({
      id: group.id,
      name: group.name,
      description: group.description,
    });
    setFormOpen(true);
  }

  function openDelete(group: DataSourceGroupListItem) {
    setDeletingGroup({ id: group.id, name: group.name });
    setDeleteOpen(true);
  }

  return (
    <>
      <div className="mx-auto w-full max-w-3xl px-4 py-8 md:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              {DATA_SOURCE_GROUP_CONFIG.listTitle}
            </h1>
            <p className="text-sm text-muted-foreground">
              {DATA_SOURCE_GROUP_CONFIG.listDescription}
            </p>
          </div>

          {canEdit ? (
            <Button type="button" className="shrink-0" onClick={openCreate}>
              <PlusIcon data-icon="inline-start" />
              {DATA_SOURCE_GROUP_CONFIG.createLabel}
            </Button>
          ) : null}
        </div>

        {errorMessage ? (
          <ResourceListEmpty
            title="Could not load data source groups"
            description={errorMessage}
          />
        ) : isInitialLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <DataSourceGroupRowSkeleton key={index} />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <ResourceListEmpty
            title={DATA_SOURCE_GROUP_CONFIG.emptyTitle}
            description={
              canEdit
                ? DATA_SOURCE_GROUP_CONFIG.emptyDescription
                : "Data source groups will appear here once they are added."
            }
            actionLabel={
              canEdit ? DATA_SOURCE_GROUP_CONFIG.createLabel : undefined
            }
            onAction={canEdit ? openCreate : undefined}
          />
        ) : (
          <ul className="space-y-3">
            {groups.map((group) => (
              <li
                key={group.id}
                className="rounded-xl border border-border bg-card shadow-sm transition-colors hover:border-muted-foreground/30"
              >
                <Link
                  href={getDataSourceGroupHref(workspaceIndex, group.id)}
                  className="block p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-md bg-muted p-2 text-muted-foreground">
                      <LayersIcon className="size-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-semibold">{group.name}</h2>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          {group.memberCount} data source
                          {group.memberCount === 1 ? "" : "s"}
                        </span>
                      </div>
                      {group.description ? (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {group.description}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </Link>

                {canEdit ? (
                  <div className="flex flex-wrap gap-2 border-t border-border px-4 py-3">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => openEdit(group)}
                    >
                      <PencilIcon data-icon="inline-start" />
                      Edit
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => openDelete(group)}
                    >
                      <Trash2Icon data-icon="inline-start" />
                      Delete
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      <DataSourceGroupFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        workspaceId={workspace.id}
        group={editingGroup}
        onSaved={refreshGroups}
      />

      <DataSourceGroupDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        workspaceId={workspace.id}
        group={deletingGroup}
        onDeleted={refreshGroups}
      />
    </>
  );
}
