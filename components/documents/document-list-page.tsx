"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { documentsQueryKey } from "@/components/documents/document-query-keys";
import { ResourceListPage } from "@/components/dashboard/resource-list-page";
import {
  DOCUMENT_CONFIG,
  getDocumentHref,
  getEmbeddingStatusBadge,
} from "@/lib/documents/document-config";
import type { ListDocumentsResult } from "@/lib/documents/types";
import type { WorkspaceListItem } from "@/lib/workspaces/types";
import { workspaceFetch } from "@/lib/workspaces/utils/workspace-fetch";

type DocumentListPageProps = {
  workspace: WorkspaceListItem;
  workspaceIndex: number;
};

async function fetchDocuments(
  workspaceId: string,
): Promise<ListDocumentsResult> {
  const res = await workspaceFetch(workspaceId, "/api/documents");
  const data = (await res.json()) as ListDocumentsResult & {
    error?: string;
    message?: string;
  };

  if (!res.ok) {
    throw new Error(data.message ?? data.error ?? "Could not load documents.");
  }

  return data;
}

function truncateContent(content: string, maxLength = 120) {
  const trimmed = content.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxLength).trimEnd()}…`;
}

export function DocumentListPage({
  workspace,
  workspaceIndex,
}: DocumentListPageProps) {
  const canEdit = workspace.permission !== "read";

  const { data, isLoading, error } = useQuery({
    queryKey: documentsQueryKey(workspace.id),
    queryFn: () => fetchDocuments(workspace.id),
  });

  const items = useMemo(() => {
    return (data?.items ?? []).map((doc) => {
      const statusBadge = getEmbeddingStatusBadge(doc.embeddingStatus);

      return {
        id: doc.id,
        name: doc.title?.trim() || doc.sourceId,
        subtitle: [
          doc.sourceName,
          doc.docType,
          doc.jobName ? `from ${doc.jobName}` : null,
        ]
          .filter(Boolean)
          .join(" · "),
        description: truncateContent(doc.rawContent),
        date: doc.publishedAt ?? doc.createdAt,
        meta:
          doc.qualityScore != null
            ? `Quality ${Math.round(doc.qualityScore * 100)}%`
            : undefined,
        badges: [
          statusBadge,
          ...(doc.isDuplicate
            ? [
                {
                  label: "Duplicate",
                  className: "bg-muted text-muted-foreground",
                },
              ]
            : []),
        ],
      };
    });
  }, [data?.items]);

  return (
    <ResourceListPage
      title={DOCUMENT_CONFIG.listTitle}
      description={DOCUMENT_CONFIG.listDescription}
      items={items}
      emptyTitle={DOCUMENT_CONFIG.emptyTitle}
      emptyDescription={
        canEdit
          ? DOCUMENT_CONFIG.emptyDescription
          : "Documents will appear here once they are added to this workspace."
      }
      createHref={canEdit ? getDocumentHref(workspaceIndex, "new") : undefined}
      createLabel={DOCUMENT_CONFIG.createLabel}
      isLoading={isLoading}
      errorMessage={error?.message}
      getItemHref={(item) => getDocumentHref(workspaceIndex, item.id)}
    />
  );
}
