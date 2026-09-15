"use client";

import { Loader2Icon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import {
  DATA_SOURCE_GROUP_CONFIG,
  MAX_GROUPS_PER_DATA_SOURCE,
} from "@/lib/data-source-groups/data-source-group-config";
import type { DataSourceGroupMemberItem } from "@/lib/data-source-groups/types";
import { isSourceType } from "@/lib/data-sources/constants";
import { getDataSourceMenuConfigByJobType } from "@/lib/data-sources/data-source-menu-config";
import type { ListDataSourcesResult } from "@/lib/data-sources/types";
import { cn } from "@/lib/utils";
import { workspaceFetch } from "@/lib/workspaces/utils/workspace-fetch";

type DataSourceGroupAddMembersDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  groupId: string;
  members: DataSourceGroupMemberItem[];
  onAdded: () => Promise<void>;
};

async function fetchAllDataSources(
  workspaceId: string,
): Promise<ListDataSourcesResult["items"]> {
  const res = await workspaceFetch(workspaceId, "/api/data-sources");
  const data = (await res.json()) as ListDataSourcesResult & {
    error?: string;
    message?: string;
  };

  if (!res.ok) {
    throw new Error(
      data.message ?? data.error ?? "Could not load data sources.",
    );
  }

  return data.items;
}

export function DataSourceGroupAddMembersDialog({
  open,
  onOpenChange,
  workspaceId,
  groupId,
  members,
  onAdded,
}: DataSourceGroupAddMembersDialogProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dataSources, setDataSources] = useState<ListDataSourcesResult["items"]>(
    [],
  );
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string>();
  const [saving, setSaving] = useState(false);

  const memberIds = useMemo(
    () => new Set(members.map((member) => member.id)),
    [members],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    setSelectedIds([]);
    setDataSources([]);
    setLoadError(undefined);
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;

    async function loadDataSources() {
      setLoading(true);
      setLoadError(undefined);

      try {
        const items = await fetchAllDataSources(workspaceId);
        if (!cancelled) {
          setDataSources(items);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Could not load data sources.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadDataSources();

    return () => {
      cancelled = true;
    };
  }, [open, workspaceId]);

  const visibleDataSources = useMemo(
    () =>
      dataSources
        .filter((dataSource) => !memberIds.has(dataSource.id))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [dataSources, memberIds],
  );

  function toggleDataSource(dataSourceId: string) {
    setSelectedIds((current) =>
      current.includes(dataSourceId)
        ? current.filter((id) => id !== dataSourceId)
        : [...current, dataSourceId],
    );
  }

  async function handleAdd() {
    if (selectedIds.length === 0) {
      return;
    }

    setSaving(true);

    try {
      const dataSourceIds = [...memberIds, ...selectedIds];
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
        toast.add({
          title: data.message ?? data.error ?? "Could not add members.",
          type: "error",
        });
        return;
      }

      toast.add({
        title: data.message ?? "Data sources added to group.",
        type: "success",
      });
      onOpenChange(false);
      await onAdded();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{DATA_SOURCE_GROUP_CONFIG.addMembersTitle}</DialogTitle>
          <DialogDescription>
            {DATA_SOURCE_GROUP_CONFIG.addMembersDescription}
          </DialogDescription>
        </DialogHeader>

        <p className="text-xs text-muted-foreground">
          {selectedIds.length} selected · max {MAX_GROUPS_PER_DATA_SOURCE}{" "}
          groups per data source
        </p>

        <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-border">
          {loadError ? (
            <p className="p-4 text-sm text-destructive">{loadError}</p>
          ) : loading && visibleDataSources.length === 0 ? (
            <div className="space-y-2 p-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-full" />
              ))}
            </div>
          ) : visibleDataSources.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              {DATA_SOURCE_GROUP_CONFIG.addMembersEmptyTitle}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {visibleDataSources.map((dataSource) => {
                const checked = selectedIds.includes(dataSource.id);
                const menu = isSourceType(dataSource.sourceType)
                  ? getDataSourceMenuConfigByJobType(dataSource.sourceType)
                  : null;

                return (
                  <li key={dataSource.id}>
                    <label className="flex cursor-pointer items-start gap-3 px-3 py-2.5 hover:bg-muted/40">
                      <input
                        type="checkbox"
                        className={cn(
                          "mt-0.5 size-4 shrink-0 rounded border border-input",
                          saving && "cursor-not-allowed opacity-50",
                        )}
                        checked={checked}
                        disabled={saving}
                        onChange={() => toggleDataSource(dataSource.id)}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium">
                          {dataSource.name}
                        </span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {menu?.label ?? dataSource.sourceType}
                          {!dataSource.enabled ? " · disabled" : ""}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={saving || selectedIds.length === 0}
            onClick={handleAdd}
          >
            {saving ? (
              <>
                <Loader2Icon className="animate-spin" data-icon="inline-start" />
                Adding…
              </>
            ) : (
              DATA_SOURCE_GROUP_CONFIG.addMembersLabel
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
