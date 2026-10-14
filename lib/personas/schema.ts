import { z } from "zod";

import { chatModelIdSchema } from "@/lib/langchain/models/registry";

import { SYNTHETIC_CONFIG } from "./config";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Params of one `synthetic-threads` run (`collect_runs.params`). The source is `collect_runs.source_id`. */
export const syntheticThreadsParamsSchema = z.object({
  panelId: z.uuid(),
  /** What happened; goes into every prompt and into each item's metadata. */
  brief: z.string().trim().min(1).max(2000),
  postCount: z.int().min(1).max(SYNTHETIC_CONFIG.maxThreadsPerRun),
  commentsPerPost: z
    .tuple([z.int().min(0).max(200), z.int().min(0).max(200)])
    .refine(([min, max]) => min <= max, {
      error: "commentsPerPost must be [min, max] with min <= max.",
    })
    .default([0, 12]),
  window: z
    .object({
      from: z.iso.datetime({ offset: true }),
      to: z.iso.datetime({ offset: true }),
    })
    .refine((value) => Date.parse(value.from) < Date.parse(value.to), {
      error: "window.from must be before window.to.",
    })
    .default(() => {
      const now = Date.now();
      return {
        from: new Date(now - DAY_MS).toISOString(),
        to: new Date(now).toISOString(),
      };
    }),
  language: z.enum(["vi"]).default("vi"),
  /** Fixes the plan (counts, times, persona allocation); LLM text still varies. */
  seed: z
    .int()
    .min(0)
    .max(2 ** 32 - 1)
    .default(() => Math.floor(Math.random() * 2 ** 32)),
  model: chatModelIdSchema.default(SYNTHETIC_CONFIG.model),
  /** Source whose real comments are shown to the model as voice examples. */
  styleSourceId: z.uuid().optional(),
  /** Look-alike sentences (same name, other meaning) mixed in as noise comments. */
  distractors: z.array(z.string().trim().min(1).max(500)).max(20).default([]),
});

export type SyntheticThreadsParams = z.infer<typeof syntheticThreadsParamsSchema>;

export const personaKindSchema = z.enum(["individual", "organization"]);
export type PersonaKindValue = z.infer<typeof personaKindSchema>;

/**
 * One raw record of the `synthetic-threads` payload: a single post, comment or
 * reply with the spec it was generated from. Stored on R2, so normalize can
 * run again without calling the LLM.
 */
export const syntheticRecordSchema = z.object({
  kind: z.enum(["post", "comment", "reply"]),
  externalId: z.string().min(1),
  parentExternalId: z.string().nullable(),
  rootExternalId: z.string().nullable(),
  text: z.string(),
  publishedAt: z.iso.datetime({ offset: true }),
  likeCount: z.int().min(0),
  commentCount: z.int().min(0),
  shareCount: z.int().min(0),
  reactions: z.record(z.string(), z.int().min(0)).nullable(),
  author: z.object({
    externalId: z.string().min(1),
    name: z.string(),
    personaId: z.uuid().nullable(),
    followerCount: z.int().min(0),
  }),
  spec: z.object({
    panelId: z.uuid(),
    brief: z.string(),
    threadIndex: z.int().min(0),
    personaId: z.uuid().nullable(),
    sentiment: z.enum(["positive", "neutral", "negative"]),
    aspect: z.string().nullable(),
    length: z.enum(["short", "medium", "long"]),
    /** Optional: payloads archived before this field existed still parse. */
    briefRelevance: z.enum(["direct", "related", "general"]).optional(),
    noise: z.enum(["spam", "off-topic", "distractor"]).nullable(),
    /** Degradations applied to the LLM text: `no-diacritics`, `typo`. */
    degraded: z.array(z.string()),
  }),
});

export type SyntheticRecord = z.infer<typeof syntheticRecordSchema>;
