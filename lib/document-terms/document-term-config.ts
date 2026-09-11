/** Who assigned a document to a term (document_terms.assigned_by). */
export const DOCUMENT_TERM_ASSIGNED_BY = {
  admin: "admin",
  adminMerge: "admin_merge",
  llmClassifier: "llm_classifier",
  termBackfill: "term_backfill",
} as const;

/** Use disable-trigger bulk insert when at least this many documents are affected. */
export const BULK_ASSIGN_DOCUMENT_TERMS_THRESHOLD = 100;

/** Documents per batch when re-syncing chunks.term_ids after bulk assign. */
export const CHUNK_TERM_SYNC_BATCH_SIZE = 1000;

/** INSERT batch size when using the trigger-enabled path. */
export const DOCUMENT_TERM_INSERT_BATCH_SIZE = 500;

export const TRG_SYNC_CHUNK_TERMS = "trg_sync_chunk_terms";
