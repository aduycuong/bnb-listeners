"use client";

import { useSearchParams } from "next/navigation";

import { ResearchCreatePage } from "@/components/research/research-create-page";
import { ResearchDetailPage } from "@/components/research/research-detail-page";
import { ResearchListPage } from "@/components/research/research-list-page";
import { useWorkspaceRouteContext } from "@/hooks/use-workspace-route-context";
import type { DepthLevel } from "@/lib/research/types";

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

  const query = searchParams.get("query") ?? undefined;
  const context = searchParams.get("context") ?? undefined;
  const depth = searchParams.get("depth");
  const parsedDepth =
    depth === "quick" || depth === "standard" || depth === "deep"
      ? depth
      : undefined;

  return (
    <ResearchCreatePage
      workspace={workspace}
      workspaceIndex={workspaceIndex}
      initialValues={{
        query,
        context,
        depth: parsedDepth as DepthLevel | undefined,
      }}
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
