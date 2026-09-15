"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftIcon, PencilIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ResourceListEmpty } from "@/components/dashboard/resource-list-empty";
import { DataSourceGroupDeleteDialog } from "@/components/data-source-groups/data-source-group-delete-dialog";
import { DataSourceGroupDetailGeneral } from "@/components/data-source-groups/data-source-group-detail-general";
import { DataSourceGroupFormDialog } from "@/components/data-source-groups/data-source-group-form-dialog";
import { DataSourceGroupMembersSection } from "@/components/data-source-groups/data-source-group-members-section";
import {
  dataSourceGroupMembersQueryKey,
  dataSourceGroupQueryKey,
  dataSourceGroupsQueryKey,
} from "@/components/data-source-groups/data-source-group-query-keys";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getDataSourceGroupHref } from "@/lib/data-source-groups/data-source-group-config";
import type {
  DataSourceGroupDetail,
  ListDataSourceGroupMembersResult,
} from "@/lib/data-source-groups/types";
import type { WorkspaceListItem } from "@/lib/workspaces/types";
import { workspaceFetch } from "@/lib/workspaces/utils/workspace-fetch";

type DataSourceGroupDetailPageProps = {
  workspace: WorkspaceListItem;
  workspaceIndex: number;
  groupId: string;
};

async function fetchDataSourceGroup(
  workspaceId: string,
  groupId: string,
): Promise<DataSourceGroupDetail> {
  const res = await workspaceFetch(
    workspaceId,
    `/api/data-source-groups/${groupId}`,
  );
  const data = (await res.json()) as DataSourceGroupDetail & {
    error?: string;
    message?: string;
  };

  if (!res.ok) {
    throw new Error(
      data.message ?? data.error ?? "Could not load data source group.",
    );
  }

  return data;
}

async function fetchDataSourceGroupMembers(
  workspaceId: string,
  groupId: string,
): Promise<ListDataSourceGroupMembersResult> {
  const res = await workspaceFetch(
    workspaceId,
    `/api/data-source-groups/${groupId}/members`,
  );
  const data = (await res.json()) as ListDataSourceGroupMembersResult & {
    error?: string;
    message?: string;
  };

  if (!res.ok) {
    throw new Error(
      data.message ?? data.error ?? "Could not load group members.",
    );
  }

  return data;
}

export function DataSourceGroupDetailPage({
  workspace,
  workspaceIndex,
  groupId,
}: DataSourceGroupDetailPageProps) {
  const canEdit = workspace.permission !== "read";
  const router = useRouter();
  const queryClient = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const groupQuery = useQuery({
    queryKey: dataSourceGroupQueryKey(workspace.id, groupId),
    queryFn: () => fetchDataSourceGroup(workspace.id, groupId),
  });

  const membersQuery = useQuery({
    queryKey: dataSourceGroupMembersQueryKey(workspace.id, groupId),
    queryFn: () => fetchDataSourceGroupMembers(workspace.id, groupId),
  });

  const group = groupQuery.data;
  const isInitialLoading = groupQuery.isLoading;
  const errorMessage = groupQuery.error?.message;

  async function refreshGroup() {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: dataSourceGroupQueryKey(workspace.id, groupId),
      }),
      queryClient.invalidateQueries({
        queryKey: dataSourceGroupMembersQueryKey(workspace.id, groupId),
      }),
      queryClient.invalidateQueries({
        queryKey: dataSourceGroupsQueryKey(workspace.id),
      }),
    ]);
  }

  async function handleDeleted() {
    await queryClient.invalidateQueries({
      queryKey: dataSourceGroupsQueryKey(workspace.id),
    });
    router.push(getDataSourceGroupHref(workspaceIndex));
  }

  if (isInitialLoading) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 md:px-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (errorMessage || !group) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8 md:px-8">
        <ResourceListEmpty
          title="Could not load data source group"
          description={errorMessage ?? "Group not found."}
        />
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 md:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            <Button
              nativeButton={false}
              variant="ghost"
              size="sm"
              className="-ml-2 w-fit"
              render={
                <Link href={getDataSourceGroupHref(workspaceIndex)} />
              }
            >
              <ArrowLeftIcon data-icon="inline-start" />
              Back to groups
            </Button>

            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight">
                {group.name}
              </h1>
              {group.description ? (
                <p className="text-sm text-muted-foreground">
                  {group.description}
                </p>
              ) : null}
            </div>
          </div>

          {canEdit ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setFormOpen(true)}
              >
                <PencilIcon data-icon="inline-start" />
                Edit
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2Icon data-icon="inline-start" />
                Delete
              </Button>
            </div>
          ) : null}
        </div>

        <DataSourceGroupDetailGeneral group={group} />

        <DataSourceGroupMembersSection
          workspaceId={workspace.id}
          workspaceIndex={workspaceIndex}
          groupId={groupId}
          group={group}
          canEdit={canEdit}
          members={membersQuery.data}
          isLoading={membersQuery.isLoading}
          errorMessage={membersQuery.error?.message}
          onSaved={refreshGroup}
        />
      </div>

      {canEdit ? (
        <>
          <DataSourceGroupFormDialog
            open={formOpen}
            onOpenChange={setFormOpen}
            workspaceId={workspace.id}
            group={group}
            onSaved={refreshGroup}
          />

          <DataSourceGroupDeleteDialog
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            workspaceId={workspace.id}
            group={group}
            onDeleted={handleDeleted}
          />
        </>
      ) : null}
    </>
  );
}
