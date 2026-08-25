import type { z } from "zod";
import type { createDocumentBodySchema, updateDocumentBodySchema } from "./schema";
import type { Document } from "@/db/schema";

export type CreateDocumentBody = z.infer<typeof createDocumentBodySchema>;
export type CreateDocumentParams = CreateDocumentBody;
export type CreateDocumentResult = Document;

export type UpdateDocumentBody = z.infer<typeof updateDocumentBodySchema>;
export type UpdateDocumentParams = { id: string } & UpdateDocumentBody;
export type UpdateDocumentResult = Document;

export type DeleteDocumentParams = { id: string };
export type DeleteDocumentResult = { id: string; message: string };
