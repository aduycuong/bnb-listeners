"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftIcon, Loader2Icon, RotateCcwIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ResourceListEmpty } from "@/components/dashboard/resource-list-empty";
import { ResearchDeleteDialog } from "@/components/research/research-delete-dialog";
import { ResearchReport } from "@/components/research/research-report";
import {
  researchRunQueryKey,
  researchRunsQueryKey,
} from "@/components/research/research-query-keys";
import {
  fetchResearchRun,
  startResearchRunRequest,
} from "@/components/research/research-request";
import { ResearchStatusBanner } from "@/components/research/research-status-banner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import {
  getResearchDepthLabel,
  getResearchHref,
  getResearchStatusBadgeClass,
  getResearchStatusLabel,
} from "@/lib/research/research-config";
import type { WorkspaceListItem } from "@/lib/workspaces/types";

type ResearchDetailPageProps = {
  workspace: WorkspaceListItem;
  workspaceIndex: number;
  runId: string;
};

function formatTimestamp(value: string | null): string {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function ResearchDetailPage({
  workspace,
  workspaceIndex,
  runId,
}: ResearchDetailPageProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const canEdit = workspace.permission !== "read";
  const [rerunning, setRerunning] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const listHref = getResearchHref(workspaceIndex);

  const runQuery = useQuery({
    queryKey: researchRunQueryKey(workspace.id, runId),
    queryFn: () => fetchResearchRun(workspace.id, runId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "pending" || status === "running") {
        return 3000;
      }

      return false;
    },
  });

  const run = runQuery.data;
  const isActive = run?.status === "pending" || run?.status === "running";

  async function handleRerun() {
    if (!run || !canEdit) {
      return;
    }

    setRerunning(true);

    try {
      const result = await startResearchRunRequest(workspace.id, {
        query: run.query,
        context: run.background ?? undefined,
        depth: run.depth,
        clarificationMode: "off",
      });

      if (result.status === "needs_clarification") {
        router.push(
          `${getResearchHref(workspaceIndex, "new")}?query=${encodeURIComponent(run.query)}`,
        );
        return;
      }

      await queryClient.invalidateQueries({
        queryKey: researchRunsQueryKey(workspace.id),
      });

      toast.add({ title: "Research rerun started.", type: "success" });
      router.push(getResearchHref(workspaceIndex, result.jobId));
    } catch (error) {
      toast.add({
        title:
          error instanceof Error ? error.message : "Could not rerun research.",
        type: "error",
      });
    } finally {
      setRerunning(false);
    }
  }

  if (runQuery.isLoading) {
    return (
      <div className="mx-auto w-full max-w-7xl space-y-4 px-4 py-8 md:px-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (runQuery.error || !run) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8">
        <ResourceListEmpty
          title="Research run not found"
          description={runQuery.error?.message ?? "This run may have been deleted."}
          actionLabel="Back to research"
          actionHref={listHref}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8">
      <div className="mb-6 space-y-4">
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link href={listHref} />}
          className="-ml-2"
        >
          <ArrowLeftIcon data-icon="inline-start" />
          Back to research
        </Button>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${getResearchStatusBadgeClass(run.status)}`}
              >
                {getResearchStatusLabel(run.status)}
              </span>
              <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                {getResearchDepthLabel(run.depth)}
              </span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">{run.query}</h1>
            {run.background ? (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {run.background}
              </p>
            ) : null}
          </div>

          {canEdit ? (
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => void handleRerun()}
                disabled={rerunning || isActive}
              >
                {rerunning ? (
                  <>
                    <Loader2Icon className="animate-spin" data-icon="inline-start" />
                    Rerunning…
                  </>
                ) : (
                  <>
                    <RotateCcwIcon data-icon="inline-start" />
                    Rerun
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2Icon data-icon="inline-start" />
                Delete
              </Button>
            </div>
          ) : null}
        </div>

        <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
          <p>Created: {formatTimestamp(run.createdAt)}</p>
          <p>Updated: {formatTimestamp(run.updatedAt)}</p>
          <p>Finished: {formatTimestamp(run.finishedAt)}</p>
        </div>
      </div>

      <div className="space-y-6">
        <ResearchStatusBanner status={run.status} error={run.error} />

        {run.status === "succeeded" && run.result ? (
          <ResearchReport result={run.result} />
        ) : null}

        {!isActive && run.status !== "succeeded" && run.status !== "failed" ? (
          <ResourceListEmpty
            title="No results yet"
            description="This run has not produced a report."
          />
        ) : null}
      </div>

      <ResearchDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        workspaceId={workspace.id}
        run={run ? { id: runId, query: run.query } : undefined}
        onDeleted={async () => {
          await queryClient.invalidateQueries({
            queryKey: researchRunsQueryKey(workspace.id),
          });
          router.push(listHref);
        }}
      />
    </div>
  );
}
