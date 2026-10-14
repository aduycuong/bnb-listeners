import { z } from "zod";

export const MENTION_PAGE_SIZE = 50;

export const listMentionsQuerySchema = z.object({
  relevance: z.enum(["relevant", "rejected", "all"]).default("relevant"),
  matchType: z.enum(["direct", "context", "manual", "all"]).default("all"),
  kind: z.enum(["post", "comment", "reply", "all"]).default("all"),
  labeled: z.enum(["yes", "no", "all"]).default("all"),
  entityId: z.uuid().optional(),
  sourceId: z.uuid().optional(),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  q: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
});

export const setItemLabelBodySchema = z.object({
  contentItemId: z.uuid(),
  /** Null removes the label. */
  isRelevant: z.boolean().nullable(),
  sampleId: z.uuid().optional(),
});

export const createLabelSampleBodySchema = z.object({
  mentions: z.number().int().min(0).max(500).default(100),
  unmatched: z.number().int().min(0).max(500).default(50),
});

export type ListMentionsQuery = z.input<typeof listMentionsQuerySchema>;
