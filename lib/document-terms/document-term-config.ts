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

/** Use disable-trigger bulk insert when at least this many documents are affected. */
export const BULK_ASSIGN_DOCUMENT_TERMS_THRESHOLD = 100;

/** Documents per batch when re-syncing chunks.term_ids after bulk assign. */
export const CHUNK_TERM_SYNC_BATCH_SIZE = 1000;

/** INSERT batch size when using the trigger-enabled path. */
export const DOCUMENT_TERM_INSERT_BATCH_SIZE = 500;

export const TRG_SYNC_CHUNK_TERMS = "trg_sync_chunk_terms";
