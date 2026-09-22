"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";

import { ResearchCreatePage } from "@/components/research/research-create-page";
import { ResearchDetailPage } from "@/components/research/research-detail-page";
import { ResearchListPage } from "@/components/research/research-list-page";
import { researchRunQueryKey } from "@/components/research/research-query-keys";
import { fetchResearchRun } from "@/components/research/research-request";
import { useWorkspaceRouteContext } from "@/hooks/use-workspace-route-context";
import { getResearchRunFormContext } from "@/lib/research/utils/get-research-run-form-context";
import { Skeleton } from "@/components/ui/skeleton";

type ResearchListRoutePageProps = {
  workspaceIndexParam: string;
};

export function ResearchListRoutePage({
  workspaceIndexParam,
}: ResearchListRoutePageProps) {
  const { workspace, workspaceIndex } =
    useWorkspaceRouteContext(workspaceIndexParam);

  if (!workspace) {
    return null;
  }

  return (
    <ResearchListPage workspace={workspace} workspaceIndex={workspaceIndex} />
  );
}

type ResearchCreateRoutePageProps = {
  workspaceIndexParam: string;
};

export function ResearchCreateRoutePage({
  workspaceIndexParam,
}: ResearchCreateRoutePageProps) {
  const { workspace, workspaceIndex } =
    useWorkspaceRouteContext(workspaceIndexParam);
  const searchParams = useSearchParams();

  if (!workspace) {
    return null;
  }

  if (workspace.permission === "read") {
    return (
      <div className="flex h-full items-center justify-center px-4 text-sm text-muted-foreground">
        You need edit access to start research runs.
      </div>
    );
  }

  const fromRunId = searchParams.get("fromRunId")?.trim() || undefined;

  const sourceRunQuery = useQuery({
    queryKey: researchRunQueryKey(workspace.id, fromRunId ?? ""),
    queryFn: () => fetchResearchRun(workspace.id, fromRunId!),
    enabled: Boolean(fromRunId),
  });

  if (fromRunId && sourceRunQuery.isLoading) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-4 px-4 py-8 md:px-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (fromRunId && sourceRunQuery.error) {
    return (
      <div className="flex h-full items-center justify-center px-4 text-sm text-destructive">
        {sourceRunQuery.error.message}
      </div>
    );
  }

  const sourceRun = sourceRunQuery.data;

  return (
    <ResearchCreatePage
      workspace={workspace}
      workspaceIndex={workspaceIndex}
      mode={fromRunId ? "rerun" : "create"}
      initialValues={
        sourceRun
          ? {
              query: sourceRun.query,
              context: getResearchRunFormContext(sourceRun),
              depth: sourceRun.depth,
              clarificationMode: sourceRun.clarificationMode,
            }
          : undefined
      }
    />
  );
}

type ResearchDetailRoutePageProps = {
  workspaceIndexParam: string;
  runId: string;
};

export function ResearchDetailRoutePage({
  workspaceIndexParam,
  runId,
}: ResearchDetailRoutePageProps) {
  const { workspace, workspaceIndex } =
    useWorkspaceRouteContext(workspaceIndexParam);

  if (!workspace) {
    return null;
  }

  return (
    <ResearchDetailPage
      workspace={workspace}
      workspaceIndex={workspaceIndex}
      runId={runId}
    />
  );
}
