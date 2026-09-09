/** Who assigned a document to a topic (document_topics.assigned_by). */
export const DOCUMENT_TOPIC_ASSIGNED_BY = {
  admin: "admin",
  adminMerge: "admin_merge",
  llmClassifier: "llm_classifier",
  topicBackfill: "topic_backfill",
} as const;

/** Use disable-trigger bulk insert when at least this many documents are affected. */
export const BULK_ASSIGN_DOCUMENT_TOPICS_THRESHOLD = 100;

/** Documents per batch when re-syncing chunks.topic_ids after bulk assign. */
export const CHUNK_TOPIC_SYNC_BATCH_SIZE = 1000;

/** INSERT batch size when using the trigger-enabled path. */
export const DOCUMENT_TOPIC_INSERT_BATCH_SIZE = 500;

export const TRG_SYNC_CHUNK_TOPICS = "trg_sync_chunk_topics";
