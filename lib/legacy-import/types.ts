export const LEGACY_IMPORT_CONNECTOR = "legacy-import";

export type LegacyCommentPhase = "comment" | "reply";

export type ImportLegacyPostsBatchParams = {
  collectRunId: string;
  /** Exclusive `documents.id` cursor. */
  afterId: string | null;
  limit: number;
};

export type ImportLegacyCommentsBatchParams = {
  collectRunId: string;
  /** Top-level comments are imported before replies so replies find their parent. */
  phase: LegacyCommentPhase;
  /** Exclusive `comments.id` cursor. */
  afterId: string | null;
  limit: number;
};

export type ImportLegacyBatchResult = {
  /** Cursor for the next batch; null when the table is exhausted. */
  nextAfterId: string | null;
  read: number;
  inserted: number;
  updated: number;
  /** Rows already collected by a connector, or with no usable source. */
  skipped: number;
};
