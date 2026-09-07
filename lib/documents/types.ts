import type { z } from "zod";
import type { createDocumentBodySchema, updateDocumentBodySchema } from "./schema";
import type { Document } from "@/db/schema";
import type { documentFormSchema } from "./schema";

export type CreateDocumentBody = z.infer<typeof createDocumentBodySchema>;
export type CreateDocumentParams = CreateDocumentBody;
export type CreateDocumentResult = Document;

export type UpdateDocumentBody = z.infer<typeof updateDocumentBodySchema>;
export type UpdateDocumentParams = { id: string } & UpdateDocumentBody;
export type UpdateDocumentResult = Document;

export type DeleteDocumentParams = { id: string };
export type DeleteDocumentResult = { id: string; message: string };

export type GetDocumentParams = { id: string };
export type GetDocumentResult = Document & {
  jobId: string | null;
  jobName: string | null;
  jobType: string | null;
};

export type ListDocumentsParams = {
  docType?: string;
  embeddingStatus?: string;
  groupIds?: string[];
  jobIds?: string[];
  offset?: number;
  limit?: number;
};

export type DocumentListItem = {
  id: string;
  docType: string;
  sourceKey: string;
  sourceName: string;
  sourceId: string;
  title: string | null;
  rawContent: string;
  embeddingStatus: string;
  qualityScore: number | null;
  isDuplicate: boolean;
  jobRunId: string | null;
  jobName: string | null;
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

export type DocumentFormValues = z.infer<typeof documentFormSchema>;

export type UpsertDocumentParams = CreateDocumentParams & {
  /** Set only on insert; later upserts leave the original job run in place. */
  jobRunId?: string;
  /** Set only on insert; upsert/update does not overwrite an existing group. */
  groupId?: string | null;
};

/** Result of an upsert-document operation. */
export type UpsertOutcome = "inserted" | "updated" | "unchanged";

export type UpsertDocumentResult = {
  documentId: string;
  outcome: UpsertOutcome;
};
