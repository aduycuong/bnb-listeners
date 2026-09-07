export const DOCUMENT_SEGMENT = "documents";

export const DOCUMENT_CONFIG = {
  segment: DOCUMENT_SEGMENT,
  listTitle: "Documents",
  listDescription:
    "Content ingested into this workspace for scoring, classification, and search.",
  emptyTitle: "No documents yet",
  emptyDescription: "Documents appear here after a scrape job ingests content.",
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
