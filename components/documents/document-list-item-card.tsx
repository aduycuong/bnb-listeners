"use client";

import {
  ResourceListRow,
  type ResourceListRowItem,
} from "@/components/dashboard/resource-list-page";
import { getDocumentHref, getEmbeddingStatusBadge } from "@/lib/documents/document-config";
import type { DocumentCardItem } from "@/lib/documents/types";
import { buildDocumentHeading } from "@/lib/documents/utils/build-document-heading";

export const DOCUMENT_LIST_ITEM_SKELETON_CLASS = "h-18.5 w-full rounded-xl";

function truncateContent(content: string, maxLength = 120) {
  const trimmed = content.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxLength).trimEnd()}…`;
}

export function documentCardItemToListRowItem(
  document: DocumentCardItem,
): ResourceListRowItem {
  const statusBadge = getEmbeddingStatusBadge(document.embeddingStatus);
  const metaParts: string[] = [];

  if (document.qualityScore != null) {
    metaParts.push(`Quality ${Math.round(document.qualityScore * 100)}%`);
  }

  if (document.confidence != null) {
    metaParts.push(`Confidence ${Math.round(document.confidence * 100)}%`);
  }

  return {
    id: document.id,
    // Header already carries the date, so the right-column date is hidden.
    name: buildDocumentHeading(document),
    subtitle: [
      document.sourceOriginName,
      document.dataSourceName ? `from ${document.dataSourceName}` : null,
    ]
      .filter(Boolean)
      .join(" · "),
    docType: document.docType,
    description: truncateContent(document.rawContent),
    date: document.publishedAt ?? document.createdAt,
    hideDate: true,
    meta: metaParts.length > 0 ? metaParts.join(" · ") : undefined,
    badges: [statusBadge],
    terms: document.terms,
  };
}

type DocumentListItemCardProps = {
  document: DocumentCardItem;
  workspaceIndex: number;
};

export function DocumentListItemCard({
  document,
  workspaceIndex,
}: DocumentListItemCardProps) {
  return (
    <ResourceListRow
      item={documentCardItemToListRowItem(document)}
      href={getDocumentHref(workspaceIndex, document.id)}
    />
  );
}
