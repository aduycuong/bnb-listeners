import { z } from "zod";

import { SENTIMENTS } from "@/lib/enrichment/config";
import { isReadyExtractionSchemaKey } from "@/lib/enrichment/registry";
import { METRICS_CONFIG } from "@/lib/metrics/config";

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
  /** `mention_extractions.schema_key`. `all` keeps every mention. */
  schemaKey: z
    .string()
    .default("all")
    .refine((value) => value === "all" || isReadyExtractionSchemaKey(value), {
      error: "Schema trích xuất không hợp lệ.",
    }),
  sourceId: z.uuid().optional(),
  authorId: z.uuid().optional(),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  /** Last N whole days in the project timezone, today included. Same periods as the other reports. */
  days: z
    .union([
      z.literal(METRICS_CONFIG.reportPeriodDays[0]),
      z.literal(METRICS_CONFIG.reportPeriodDays[1]),
      z.literal(METRICS_CONFIG.reportPeriodDays[2]),
      z.literal(`${METRICS_CONFIG.reportPeriodDays[0]}`),
      z.literal(`${METRICS_CONFIG.reportPeriodDays[1]}`),
      z.literal(`${METRICS_CONFIG.reportPeriodDays[2]}`),
    ])
    .optional()
    .transform((value) => (value === undefined ? undefined : Number(value))),
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
