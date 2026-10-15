import { z } from "zod";

import { SENTIMENTS } from "@/lib/enrichment/config";

export const MENTION_PAGE_SIZE = 50;

export const listMentionsQuerySchema = z.object({
  relevance: z.enum(["relevant", "rejected", "all"]).default("relevant"),
  matchType: z.enum(["direct", "context", "manual", "all"]).default("all"),
  kind: z.enum(["post", "comment", "reply", "all"]).default("all"),
  labeled: z.enum(["yes", "no", "all"]).default("all"),
  sentiment: z.enum([...SENTIMENTS, "all"]).default("all"),
  aspectId: z.uuid().optional(),
  entityId: z.uuid().optional(),
  topicId: z.uuid().optional(),
  sourceId: z.uuid().optional(),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  q: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
});

export const setItemLabelBodySchema = z.object({
  contentItemId: z.uuid(),
  /** Null removes the whole label. */
  isRelevant: z.boolean().nullable(),
  /** Omitted: keep the current value. Null: clear it. */
  sentiment: z.enum(SENTIMENTS).nullable().optional(),
  /** Omitted: keep. Null: clear. [] means "no aspect". */
  aspectKeys: z.array(z.string().min(1).max(60)).max(20).nullable().optional(),
  sampleId: z.uuid().optional(),
});

export const LABEL_SAMPLE_KINDS = ["match", "enrich"] as const;

export const createLabelSampleBodySchema = z.object({
  /** match: relevance across strata. enrich: sentiment and aspects of relevant mentions. */
  kind: z.enum(LABEL_SAMPLE_KINDS).default("match"),
  mentions: z.number().int().min(0).max(500).default(100),
  unmatched: z.number().int().min(0).max(500).default(50),
});

export type ListMentionsQuery = z.input<typeof listMentionsQuerySchema>;
