"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2Icon } from "lucide-react";
import { useMemo, useState } from "react";

import { ResourceListPage } from "@/components/dashboard/resource-list-page";
import { ResearchDeleteDialog } from "@/components/research/research-delete-dialog";
import {
  researchRunsQueryKey,
} from "@/components/research/research-query-keys";
import { fetchResearchRuns } from "@/components/research/research-request";
import { Button } from "@/components/ui/button";
import {
  getResearchDepthLabel,
  getResearchHref,
  getResearchStatusBadgeClass,
  getResearchStatusLabel,
  RESEARCH_CONFIG,
} from "@/lib/research/research-config";
import type { WorkspaceListItem } from "@/lib/workspaces/types";

type ResearchListPageProps = {
  workspace: WorkspaceListItem;
  workspaceIndex: number;
};

export function ResearchListPage({
  workspace,
  workspaceIndex,
}: ResearchListPageProps) {
  const queryClient = useQueryClient();
  const canEdit = workspace.permission !== "read";
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingRun, setDeletingRun] = useState<
    { id: string; query: string } | undefined
  >();

  const { data, isLoading, error } = useQuery({
    queryKey: researchRunsQueryKey(workspace.id),
    queryFn: () => fetchResearchRuns(workspace.id),
    refetchInterval: (query) => {
      const hasActiveRun = query.state.data?.items.some(
        (item) => item.status === "pending" || item.status === "running",
      );

      return hasActiveRun ? 5000 : false;
    },
  });

  const items = useMemo(() => {
    return (data?.items ?? []).map((run) => ({
      id: run.id,
      name: run.query,
      description: `${getResearchDepthLabel(run.depth)} · ${getResearchStatusLabel(run.status)}`,
      date: run.createdAt,
      badges: [
        {
          label: getResearchStatusLabel(run.status),
          className: getResearchStatusBadgeClass(run.status),
        },
        {
          label: getResearchDepthLabel(run.depth),
          className: "bg-muted text-muted-foreground",
        },
      ],
      meta:
        run.findingCount != null
          ? `${run.findingCount} finding${run.findingCount === 1 ? "" : "s"}`
          : undefined,
    }));
  }, [data?.items]);

  return (
    <>
      <ResourceListPage
        title={RESEARCH_CONFIG.listTitle}
        description={RESEARCH_CONFIG.listDescription}
        items={items}
        emptyTitle={RESEARCH_CONFIG.emptyTitle}
        emptyDescription={RESEARCH_CONFIG.emptyDescription}
        createHref={canEdit ? getResearchHref(workspaceIndex, "new") : undefined}
        createLabel={RESEARCH_CONFIG.createLabel}
        isLoading={isLoading}
        errorMessage={error?.message}
        getItemHref={(item) => getResearchHref(workspaceIndex, item.id)}
        containerClassName="max-w-7xl"
        renderItemActions={
          canEdit
            ? (item) => (
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label={`Delete ${item.name}`}
                  onClick={() => {
                    setDeletingRun({ id: item.id, query: item.name });
                    setDeleteOpen(true);
                  }}
                >
                  <Trash2Icon />
                </Button>
              )
            : undefined
        }
      />

      <ResearchDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        workspaceId={workspace.id}
        run={deletingRun}
        onDeleted={async () => {
          await queryClient.invalidateQueries({
            queryKey: researchRunsQueryKey(workspace.id),
          });
          setDeletingRun(undefined);
        }}
      />
    </>
  );
}
