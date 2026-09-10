import { z } from "zod";

import { COMMENT_ROLES, COMMENT_STANCES } from "./config";

export const commentRoleSchema = z.enum(COMMENT_ROLES);
export const commentStanceSchema = z.enum(COMMENT_STANCES);

export const upsertCommentItemSchema = z.object({
  sourceId: z.string().min(1, { error: "sourceId is required" }),
  content: z
    .string()
    .transform((value) => value.trim())
    .pipe(z.string().min(1, { error: "content is required" })),
  authorName: z.string().nullable().optional(),
  authorId: z.string().nullable().optional(),
  likeCount: z.int().nonnegative().optional(),
  publishedAt: z.iso.datetime().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const upsertCommentsParamsSchema = z.object({
  documentId: z.uuid({ error: "documentId must be a valid UUID" }),
  comments: z
    .array(upsertCommentItemSchema)
    .min(1, { error: "comments must not be empty" }),
});

export const scoreDocumentCommentsPayloadSchema = z.object({
  documentId: z.uuid({ error: "documentId must be a valid UUID" }),
});
