"use client";

import { DocumentDetailPage } from "@/components/documents/document-detail-page";
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

type DocumentDetailRoutePageProps = {
  workspaceIndexParam: string;
  documentId: string;
};

export function DocumentDetailRoutePage({
  workspaceIndexParam,
  documentId,
}: DocumentDetailRoutePageProps) {
  const { workspace, workspaceIndex } =
    useWorkspaceRouteContext(workspaceIndexParam);

  if (!workspace) {
    return null;
  }

  return (
    <DocumentDetailPage
      workspace={workspace}
      workspaceIndex={workspaceIndex}
      documentId={documentId}
    />
  );
}
