import type { z } from "zod";

import type {
  commentRoleSchema,
  commentStanceSchema,
  scoreDocumentCommentsPayloadSchema,
  upsertCommentItemSchema,
  upsertCommentsParamsSchema,
} from "./schema";

export type CommentRole = z.infer<typeof commentRoleSchema>;
export type CommentStance = z.infer<typeof commentStanceSchema>;

export type UpsertCommentItem = z.infer<typeof upsertCommentItemSchema>;
export type UpsertCommentsParams = z.infer<typeof upsertCommentsParamsSchema>;

export type UpsertCommentsResult = {
  documentId: string;
  inserted: number;
  updated: number;
  unchanged: number;
  dispatched: boolean;
};

export type ScoreDocumentCommentsPayload = z.infer<
  typeof scoreDocumentCommentsPayloadSchema
>;

export type ScoreDocumentCommentsResult = {
  documentId: string;
  scored: number;
  noiseFiltered: number;
  debateCount: number;
  answerCount: number;
  infoCount: number;
  agreeCount: number;
  disagreeCount: number;
  neutralCount: number;
  substantiveCount: number;
  discussionDocumentId: string | null;
  discussionOutcome: "inserted" | "updated" | "unchanged" | "deleted" | "skipped";
};

export type CommentScoreVerdict = {
  index: number;
  role: CommentRole;
  /** Only set when role = debate; otherwise null. */
  stance: CommentStance | null;
  isSubstantive: boolean;
};
