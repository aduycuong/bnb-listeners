/** Who assigned a document to a term (document_terms.assigned_by). */
export const DOCUMENT_TERM_ASSIGNED_BY = {
  admin: "admin",
  adminMerge: "admin_merge",
  llmClassifier: "llm_classifier",
  termBackfill: "term_backfill",
  /** Copied from the parent post onto its companion discussion document. */
  parentMirror: "parent_mirror",
} as const;

export type DocumentTermAssignedBy =
  (typeof DOCUMENT_TERM_ASSIGNED_BY)[keyof typeof DOCUMENT_TERM_ASSIGNED_BY];

export const DOCUMENT_TERM_ASSIGNED_BY_LABELS: Record<
  DocumentTermAssignedBy,
  string
> = {
  [DOCUMENT_TERM_ASSIGNED_BY.admin]: "Admin",
  [DOCUMENT_TERM_ASSIGNED_BY.adminMerge]: "Admin merge",
  [DOCUMENT_TERM_ASSIGNED_BY.llmClassifier]: "Classifier",
  [DOCUMENT_TERM_ASSIGNED_BY.termBackfill]: "Term backfill",
  [DOCUMENT_TERM_ASSIGNED_BY.parentMirror]: "Parent mirror",
};

export function getDocumentTermAssignedByLabel(assignedBy: string): string {
  return (
    DOCUMENT_TERM_ASSIGNED_BY_LABELS[assignedBy as DocumentTermAssignedBy] ??
    assignedBy.replaceAll("_", " ")
  );
}
