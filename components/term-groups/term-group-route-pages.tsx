"use client";

import { TermGroupDetailPage } from "@/components/term-groups/term-group-detail-page";
import { TermGroupListPage } from "@/components/term-groups/term-group-list-page";
import { useWorkspaceRouteContext } from "@/hooks/use-workspace-route-context";

type TermGroupListRoutePageProps = {
  workspaceIndexParam: string;
};

export function TermGroupListRoutePage({
  workspaceIndexParam,
}: TermGroupListRoutePageProps) {
  const { workspace, workspaceIndex } =
    useWorkspaceRouteContext(workspaceIndexParam);

  if (!workspace) {
    return null;
  }

  return (
    <TermGroupListPage workspace={workspace} workspaceIndex={workspaceIndex} />
  );
}

type TermGroupDetailRoutePageProps = {
  workspaceIndexParam: string;
  groupId: string;
};

export function TermGroupDetailRoutePage({
  workspaceIndexParam,
  groupId,
}: TermGroupDetailRoutePageProps) {
  const { workspace, workspaceIndex } =
    useWorkspaceRouteContext(workspaceIndexParam);

  if (!workspace) {
    return null;
  }

  return (
    <TermGroupDetailPage
      workspace={workspace}
      workspaceIndex={workspaceIndex}
      groupId={groupId}
    />
  );
}
