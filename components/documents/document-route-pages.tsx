"use client";

import { useQuery } from "@tanstack/react-query";

import { DocumentFormPage } from "@/components/documents/document-form-page";
import { DocumentListPage } from "@/components/documents/document-list-page";
import { documentQueryKey } from "@/components/documents/document-query-keys";
import { useWorkspaceRouteContext } from "@/hooks/use-workspace-route-context";
import type { Document } from "@/db/schema";
import { workspaceFetch } from "@/lib/workspaces/utils/workspace-fetch";

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

export function DocumentNewRoutePage({
  workspaceIndexParam,
}: DocumentRouteProps) {
  const { workspace, workspaceIndex } =
    useWorkspaceRouteContext(workspaceIndexParam);

  if (!workspace) {
    return null;
  }

  if (workspace.permission === "read") {
    return (
      <div className="flex h-full items-center justify-center px-4 text-sm text-muted-foreground">
        You need edit access to create documents.
      </div>
    );
  }

  return (
    <DocumentFormPage
      workspace={workspace}
      workspaceIndex={workspaceIndex}
      mode="create"
    />
  );
}

type DocumentEditRoutePageProps = DocumentRouteProps & {
  documentId: string;
};

async function fetchDocument(
  workspaceId: string,
  documentId: string,
): Promise<Document> {
  const res = await workspaceFetch(workspaceId, `/api/documents/${documentId}`);
  const data = (await res.json()) as Document & {
    error?: string;
    message?: string;
  };

  if (!res.ok) {
    throw new Error(data.message ?? data.error ?? "Could not load document.");
  }

  return data;
}

export function DocumentEditRoutePage({
  workspaceIndexParam,
  documentId,
}: DocumentEditRoutePageProps) {
  const { workspace, workspaceIndex } =
    useWorkspaceRouteContext(workspaceIndexParam);

  const { data: document, isLoading, error } = useQuery({
    queryKey: documentQueryKey(workspace?.id ?? "", documentId),
    queryFn: () => fetchDocument(workspace!.id, documentId),
    enabled: !!workspace,
  });

  if (!workspace) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center px-4 text-sm text-muted-foreground">
        Loading document…
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="flex h-full items-center justify-center px-4 text-sm text-destructive">
        {error?.message ?? "Document not found."}
      </div>
    );
  }

  return (
    <DocumentFormPage
      workspace={workspace}
      workspaceIndex={workspaceIndex}
      mode="edit"
      document={document}
    />
  );
}
