import type { z } from "zod";

import type { updateDocumentBodySchema } from "./schema";
import type { DocumentTermFilterMode } from "./document-term-filter-config";
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
  terms: DocumentTermSummary[];
  discussionDocumentId: string | null;
  parentDocumentId: string | null;
};

export type ListDocumentsParams = {
  docType?: string;
  embeddingStatus?: string;
  dataSourceIds?: string[];
  dataSourceGroupId?: string;
  termFilterMode?: DocumentTermFilterMode;
  termIds?: string[];
  offset?: number;
  limit?: number;
};

export type DocumentTermSummary = {
  id: string;
  name: string;
  /** Present when loaded from document_terms; omitted in term filter selections. */
  assignedBy?: string;
};

/** Shared shape for document list cards in the UI. */
export type DocumentCardItem = {
  id: string;
  parentDocumentId: string | null;
  docType: string;
  title: string | null;
  rawContent: string;
  sourceOriginName: string;
  sourceItemId: string;
  authorName: string | null;
  embeddingStatus: string;
  dataSourceName: string | null;
  publishedAt: string | null;
  createdAt: string;
  qualityScore: number | null;
  terms: DocumentTermSummary[];
  confidence?: number;
};

export type DocumentListItem = {
  id: string;
  parentDocumentId: string | null;
  docType: string;
  sourceOriginKey: string;
  sourceOriginName: string;
  sourceItemId: string;
  title: string | null;
  rawContent: string;
  authorName: string | null;
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
  terms: DocumentTermSummary[];
};

export type ListDocumentsResult = {
  items: DocumentListItem[];
  total: number;
  hasMore: boolean;
  /** Offset of display-root groups (not flat document rows). */
  offset: number;
  /** Page size in display-root groups (not flat document rows). */
  limit: number;
  /** Display-root groups returned on this page. */
  rootCount: number;
};

export type UpsertDocumentParams = {
  docType: string;
  sourceOriginKey: string;
  sourceOriginName: string;
  sourceItemId: string;
  /** Omit for sources without a real title (social posts); never synthesize one. */
  title?: string | null;
  rawContent: string;
  /** Post author display name; refreshed on every upsert like metadata. */
  authorName?: string | null;
  /** Set only for `discussion` documents — the post the discussion was built from. */
  parentDocumentId?: string | null;
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
