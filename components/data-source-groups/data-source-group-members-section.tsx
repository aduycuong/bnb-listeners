"use client";

import { Loader2Icon, PlusIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { DataSourceGroupAddMembersDialog } from "@/components/data-source-groups/data-source-group-add-members-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { DATA_SOURCE_GROUP_CONFIG } from "@/lib/data-source-groups/data-source-group-config";
import type {
  DataSourceGroupDetail,
  ListDataSourceGroupMembersResult,
} from "@/lib/data-source-groups/types";
import { isSourceType } from "@/lib/data-sources/constants";
import {
  getDataSourceMenuConfigByJobType,
  getDataSourceMenuHref,
} from "@/lib/data-sources/data-source-menu-config";
import { workspaceFetch } from "@/lib/workspaces/utils/workspace-fetch";

type DataSourceGroupMembersSectionProps = {
  workspaceId: string;
  workspaceIndex: number;
  groupId: string;
  group?: DataSourceGroupDetail;
  canEdit: boolean;
  members?: ListDataSourceGroupMembersResult;
  isLoading?: boolean;
  errorMessage?: string;
  onSaved: () => Promise<void>;
};

export function DataSourceGroupMembersSection({
  workspaceId,
  workspaceIndex,
  groupId,
  canEdit,
  members,
  isLoading = false,
  errorMessage,
  onSaved,
}: DataSourceGroupMembersSectionProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [removingId, setRemovingId] = useState<string>();

  const memberItems = members?.items ?? [];

  async function updateMembers(dataSourceIds: string[]) {
    const res = await workspaceFetch(
      workspaceId,
      `/api/data-source-groups/${groupId}/members`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataSourceIds }),
      },
    );
    const data = (await res.json()) as {
      message?: string;
      error?: string;
    };

    if (!res.ok) {
      throw new Error(
        data.message ?? data.error ?? "Could not update members.",
      );
    }

    return data.message;
  }

  async function handleRemove(dataSourceId: string) {
    setRemovingId(dataSourceId);

    try {
      const dataSourceIds = memberItems
        .map((item) => item.id)
        .filter((id) => id !== dataSourceId);
      const message = await updateMembers(dataSourceIds);

      toast.add({
        title: message ?? "Data source removed from group.",
        type: "success",
      });
      await onSaved();
    } catch (error) {
      toast.add({
        title:
          error instanceof Error
            ? error.message
            : "Could not remove data source from group.",
        type: "error",
      });
    } finally {
      setRemovingId(undefined);
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle>{DATA_SOURCE_GROUP_CONFIG.membersTitle}</CardTitle>
              <p className="text-xs text-muted-foreground">
                {DATA_SOURCE_GROUP_CONFIG.membersListDescription}
              </p>
            </div>

            {canEdit ? (
              <Button
                type="button"
                size="sm"
                disabled={isLoading}
                onClick={() => setAddOpen(true)}
              >
                <PlusIcon data-icon="inline-start" />
                {DATA_SOURCE_GROUP_CONFIG.addMembersLabel}
              </Button>
            ) : null}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          ) : errorMessage ? (
            <p className="text-sm text-destructive">{errorMessage}</p>
          ) : memberItems.length === 0 ? (
            <div className="rounded-xl border border-dashed px-4 py-8 text-center">
              <p className="text-sm font-medium">
                {DATA_SOURCE_GROUP_CONFIG.membersEmptyTitle}
              </p>
              {canEdit ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  {DATA_SOURCE_GROUP_CONFIG.membersEmptyDescription}
                </p>
              ) : null}
            </div>
          ) : (
            <ul className="space-y-3">
              {memberItems.map((dataSource) => {
                const isRemoving = removingId === dataSource.id;
                const menu = isSourceType(dataSource.sourceType)
                  ? getDataSourceMenuConfigByJobType(dataSource.sourceType)
                  : null;
                const href = menu
                  ? getDataSourceMenuHref(workspaceIndex, menu, dataSource.id)
                  : undefined;

                return (
                  <li
                    key={dataSource.id}
                    className="rounded-xl border border-border bg-card p-4 shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      {href ? (
                        <Link
                          href={href}
                          className="min-w-0 flex-1 hover:underline"
                        >
                          <p className="text-sm font-semibold">
                            {dataSource.name}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {menu?.label ?? dataSource.sourceType}
                            {!dataSource.enabled ? " · disabled" : ""}
                          </p>
                        </Link>
                      ) : (
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold">
                            {dataSource.name}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {dataSource.sourceType}
                          </p>
                        </div>
                      )}

                      {canEdit ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={Boolean(removingId)}
                          onClick={() => handleRemove(dataSource.id)}
                        >
                          {isRemoving ? (
                            <Loader2Icon className="animate-spin" />
                          ) : (
                            <Trash2Icon data-icon="inline-start" />
                          )}
                          Remove
                        </Button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {canEdit ? (
        <DataSourceGroupAddMembersDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          workspaceId={workspaceId}
          groupId={groupId}
          members={memberItems}
          onAdded={onSaved}
        />
      ) : null}
    </>
  );
}
