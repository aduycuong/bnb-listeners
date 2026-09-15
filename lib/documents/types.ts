import type { z } from "zod";

import type { updateDocumentBodySchema } from "./schema";
import type { Document } from "@/db/schema";
import type { EngagementCounts } from "@/lib/common/engagement-counts";

export type UpdateDocumentBody = z.infer<typeof updateDocumentBodySchema>;
export type UpdateDocumentParams = { id: string } & UpdateDocumentBody;
export type UpdateDocumentResult = Document;

export type DeleteDocumentParams = { id: string };
export type DeleteDocumentResult = { id: string; message: string };

export type RunDocumentActionParams = { id: string };

export type RefreshDocumentFromSourceParams = { id: string };

export type RefreshDocumentFromSourceResult = {
  documentId: string;
  sourceRunId: string;
  status: "running";
  message: string;
  snapshotId?: string;
};

export type UpdateDocumentCommentsParams = { id: string };

export type UpdateDocumentCommentsResult = {
  documentId: string;
  sourceRunId: string;
  status: "running";
  message: string;
  snapshotId?: string;
};

export type GetDocumentParams = { id: string };
export type GetDocumentResult = Document & {
  dataSourceId: string | null;
  dataSourceName: string | null;
  sourceType: string | null;
};

export type ListDocumentsParams = {
  docType?: string;
  embeddingStatus?: string;
  dataSourceIds?: string[];
  dataSourceGroupId?: string;
  offset?: number;
  limit?: number;
};

export type DocumentListItem = {
  id: string;
  docType: string;
  sourceOriginKey: string;
  sourceOriginName: string;
  sourceItemId: string;
  title: string | null;
  rawContent: string;
  embeddingStatus: string;
  qualityScore: number | null;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  viewCount: number;
  sourceRunId: string | null;
  dataSourceId: string;
  dataSourceName: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ListDocumentsResult = {
  items: DocumentListItem[];
  hasMore: boolean;
  offset: number;
  limit: number;
};

export type UpsertDocumentParams = {
  docType: string;
  sourceOriginKey: string;
  sourceOriginName: string;
  sourceItemId: string;
  title?: string;
  rawContent: string;
  metadata?: Record<string, unknown>;
  /** Refreshed on every upsert, including the unchanged path — never triggers a re-embed. */
  engagement?: EngagementCounts;
  publishedAt?: string;
  /** Set only on insert; later upserts leave the original dataSource run in place. */
  sourceRunId?: string;
  /** Set only on insert; upsert/update does not overwrite an existing dataSource. */
  dataSourceId: string;
};

/** Result of an upsert-document operation. */
export type UpsertOutcome = "inserted" | "updated" | "unchanged";

export type UpsertDocumentResult = {
  documentId: string;
  outcome: UpsertOutcome;
};
