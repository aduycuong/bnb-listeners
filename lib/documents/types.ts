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
export type GetDocumentResult = Document;

export type ListDocumentsParams = {
  docType?: string;
  embeddingStatus?: string;
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
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ListDocumentsResult = { items: DocumentListItem[] };

export type DocumentFormValues = z.infer<typeof documentFormSchema>;

/** Result of an upsert-document operation. */
export type UpsertOutcome = "inserted" | "updated" | "unchanged";

export type UpsertDocumentResult = {
  documentId: string;
  outcome: UpsertOutcome;
};
