"use client";

import { DocumentListPage } from "@/components/documents/document-list-page";
import { useWorkspaceRouteContext } from "@/hooks/use-workspace-route-context";

type DocumentRouteProps = {
  workspaceIndexParam: string;
};

export function DocumentListRoutePage({
  workspaceIndexParam,
}: DocumentRouteProps) {
  const { workspace, workspaceIndex } =
    useWorkspaceRouteContext(workspaceIndexParam);

  if (!workspace) {
    return null;
  }

  return (
    <DocumentListPage workspace={workspace} workspaceIndex={workspaceIndex} />
  );
}
