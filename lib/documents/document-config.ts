import { DISCUSSION_DOC_TYPE } from "@/lib/comments/config";

export const DOCUMENT_SEGMENT = "documents";

export const DOCUMENT_TYPE_POST = "post" as const;

export const DOCUMENT_CONFIG = {
  segment: DOCUMENT_SEGMENT,
  listTitle: "Documents",
  listDescription:
    "Content ingested into this workspace for scoring, classification, and search.",
  emptyTitle: "No documents yet",
  emptyDescription: "Documents appear here after a scrape dataSource ingests content.",
} as const;

export function getDocumentHref(
  workspaceIndex: number,
  ...parts: string[]
): string {
  const base = `/w/${workspaceIndex}/${DOCUMENT_SEGMENT}`;
  if (parts.length === 0) {
    return base;
  }

  return `${base}/${parts.join("/")}`;
}

export function getDocumentTypeBadge(docType: string): {
  label: string;
  className: string;
} {
  switch (docType) {
    case DISCUSSION_DOC_TYPE:
      return {
        label: "Discussion",
        className:
          "bg-amber-500/15 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300",
      };
    case DOCUMENT_TYPE_POST:
      return {
        label: "Post",
        className:
          "bg-blue-500/15 text-blue-900 dark:bg-blue-500/20 dark:text-blue-300",
      };
    default:
      return {
        label: docType
          .split("_")
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" "),
        className: "bg-muted text-muted-foreground",
      };
  }
}

export function getEmbeddingStatusBadge(status: string): {
  label: string;
  className: string;
} {
  switch (status) {
    case "chunked":
      return {
        label: "Indexed",
        className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
      };
    case "pending":
      return {
        label: "Pending",
        className: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
      };
    case "skipped":
      return {
        label: "Skipped",
        className: "bg-muted text-muted-foreground",
      };
    case "failed":
      return {
        label: "Failed",
        className: "bg-destructive/10 text-destructive",
      };
    default:
      return {
        label: status,
        className: "bg-muted text-muted-foreground",
      };
  }
}
