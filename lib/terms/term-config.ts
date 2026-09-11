export const TERM_SEGMENT = "terms";

export const TERM_CREATED_BY = {
  admin: "admin",
  llmClassifier: "llm_classifier",
} as const;

export const TERM_CONFIG = {
  segment: TERM_SEGMENT,
  listTitle: "Terms",
  listDescription:
    "Từ khóa/nhãn linh hoạt để gắn và lọc tài liệu trong workspace.",
  emptyTitle: "No terms yet",
  emptyDescription: "Add a term to start classifying documents.",
  createLabel: "Add term",
  formCreateTitle: "Add term",
  formCreateDescription:
    "Create a term for classification.",
  formEditTitle: "Edit term",
  formEditDescription: "Update the term name or description.",
  detailDocumentsTitle: "Documents",
  detailDocumentsDescription:
    "Documents classified under this term, sorted by publish date.",
  detailDocumentsEmptyTitle: "No documents for this term",
  detailDocumentsEmptyDescription:
    "Documents appear here once they are classified under this term.",
  detailDocumentsSearchEmptyTitle: "No matching documents",
  detailDocumentsSearchEmptyDescription:
    "Try a different search term or clear the filter.",
} as const;

/** Max terms per bulk-delete request (each deleted in its own transaction). */
export const TERM_BULK_DELETE_MAX = 50;

/** Max source terms per merge request. */
export const TERM_MERGE_MAX_SOURCES = 50;

export function getTermHref(
  workspaceIndex: number,
  ...parts: string[]
): string {
  const base = `/w/${workspaceIndex}/${TERM_SEGMENT}`;
  if (parts.length === 0) {
    return base;
  }

  return `${base}/${parts.join("/")}`;
}
