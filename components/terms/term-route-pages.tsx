"use client";

import { TermDetailPage } from "@/components/terms/term-detail-page";
import { TermListPage } from "@/components/terms/term-list-page";
import { useWorkspaceRouteContext } from "@/hooks/use-workspace-route-context";

type TermListRoutePageProps = {
  workspaceIndexParam: string;
};

export function TermListRoutePage({
  workspaceIndexParam,
}: TermListRoutePageProps) {
  const { workspace, workspaceIndex } =
    useWorkspaceRouteContext(workspaceIndexParam);

  if (!workspace) {
    return null;
  }

  return <TermListPage workspace={workspace} workspaceIndex={workspaceIndex} />;
}

type TermDetailRoutePageProps = {
  workspaceIndexParam: string;
  termId: string;
};

export function TermDetailRoutePage({
  workspaceIndexParam,
  termId,
}: TermDetailRoutePageProps) {
  const { workspace, workspaceIndex } =
    useWorkspaceRouteContext(workspaceIndexParam);

  if (!workspace) {
    return null;
  }

  return (
    <TermDetailPage
      workspace={workspace}
      workspaceIndex={workspaceIndex}
      termId={termId}
    />
  );
}
