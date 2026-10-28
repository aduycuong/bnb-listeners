import { z } from "zod";

import { isValidCronExpression } from "@/lib/common/cron-presets";
import { chatModelIdSchema } from "@/lib/langchain/models/registry";

import { SYNTHETIC_CONFIG } from "./config";

const DAY_MS = 24 * 60 * 60 * 1000;

const commentsPerPostSchema = z
  .tuple([z.int().min(0).max(200), z.int().min(0).max(200)])
  .refine(([min, max]) => min <= max, {
    error: "commentsPerPost must be [min, max] with min <= max.",
  });

const topicsSchema = z.array(z.string().trim().min(1).max(300)).max(20);

/**
 * Params of one `synthetic-threads` run (`collect_runs.params`). The source is
 * `collect_runs.source_id`. A run takes either a `brief` or `topics`: with
 * topics the model first writes `briefCount` briefs, and each thread gets one.
 */
export const syntheticThreadsParamsSchema = z
  .object({
    panelId: z.uuid(),
    /** What happened; goes into every prompt and into each item's metadata. */
    brief: z.string().trim().min(1).max(2000).optional(),
    /** Subjects the briefs are drawn from when there is no `brief`. */
    topics: topicsSchema.default([]),
    briefCount: z.int().min(1).max(SYNTHETIC_CONFIG.maxBriefsPerRun).default(3),
    postCount: z.int().min(1).max(SYNTHETIC_CONFIG.maxThreadsPerRun),
    commentsPerPost: commentsPerPostSchema.default([0, 12]),
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
  })
  .refine((value) => value.brief !== undefined || value.topics.length > 0, {
    error: "A run needs a brief or at least one topic.",
    path: ["topics"],
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

// --- Admin forms and API bodies ---------------------------------------------

export const PERSONA_KINDS = ["individual", "organization"] as const;
export const PERSONA_REVIEW_STATUSES = ["draft", "approved"] as const;

export const personaBodySchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120),
  kind: personaKindSchema,
  description: z.string().trim().min(1, "Description is required.").max(600),
  tone: z.string().trim().max(400),
  concerns: z.array(z.string().trim().min(1).max(60)).max(12),
  reviewStatus: z.enum(PERSONA_REVIEW_STATUSES),
});

export type PersonaBody = z.infer<typeof personaBodySchema>;

/** The form edits concerns as one comma-separated line. */
export const personaFormSchema = personaBodySchema.extend({
  concerns: z.string().max(600),
});

export type PersonaFormValues = z.infer<typeof personaFormSchema>;

export const panelBodySchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120),
  description: z.string().trim().max(400),
  members: z
    .array(
      z.object({
        personaId: z.uuid("Pick a persona."),
        weight: z
          .number("Weight must be a number.")
          .positive("Weight must be above 0.")
          .max(1000),
      }),
    )
    .min(1, "Add at least one persona.")
    .refine(
      (members) =>
        new Set(members.map((member) => member.personaId)).size === members.length,
      { error: "A persona can appear only once." },
    ),
});

export type PanelBody = z.infer<typeof panelBodySchema>;

const generateFieldsSchema = z.object({
  panelId: z.uuid("Pick a panel."),
  /** Synthetic group name; the same name reuses the same source. */
  sourceName: z.string().trim().min(1, "Source name is required.").max(120),
  brief: z.string().trim().min(1, "Brief is required.").max(2000),
  posts: z.number("Posts must be a number.").int().min(1).max(500),
  minComments: z.number("Min comments must be a number.").int().min(0).max(200),
  maxComments: z.number("Max comments must be a number.").int().min(0).max(200),
  hours: z.number("Hours must be a number.").min(1).max(24 * 30),
});

const commentRangeRule = {
  path: ["maxComments"],
  error: "Max comments must be at least min comments.",
};

export const generateBodySchema = generateFieldsSchema
  .extend({
    styleSourceId: z.uuid().optional(),
    distractors: z.array(z.string().trim().min(1).max(500)).max(20),
  })
  .refine((value) => value.minComments <= value.maxComments, commentRangeRule);

export type GenerateBody = z.infer<typeof generateBodySchema>;

/** The form edits distractors as one sentence per line; `styleSourceId` is "none" or a source id. */
export const generateFormSchema = generateFieldsSchema
  .extend({
    panelId: z.string().min(1, "Pick a panel."),
    styleSourceId: z.string(),
    distractors: z.string().max(4000),
  })
  .refine((value) => value.minComments <= value.maxComments, commentRangeRule);

export type GenerateFormValues = z.infer<typeof generateFormSchema>;

// --- Scheduled synthetic sources ---------------------------------------------

const cronConfigSchema = z.object({
  cron: z.string().trim().refine(isValidCronExpression, {
    error: "Use a 5-field cron, e.g. 0 * * * *.",
  }),
  timezone: z.string().trim().min(1, "Pick a timezone."),
});

/**
 * How a synthetic source writes on its own (`sources.metadata.syntheticConfig`).
 * Each cron tick starts one run of `postsPerRun` threads about `briefsPerRun`
 * briefs that the model draws from `topics`.
 */
export const syntheticSourceConfigSchema = z.object({
  /** Off: the QStash schedule is removed; runs can still be started by hand. */
  enabled: z.boolean(),
  panelId: z.uuid("Pick a panel."),
  topics: topicsSchema.min(1, "Add at least one topic."),
  postsPerRun: z
    .number("Posts must be a number.")
    .int()
    .min(1)
    .max(SYNTHETIC_CONFIG.maxThreadsPerRun),
  commentsPerPost: commentsPerPostSchema,
  briefsPerRun: z
    .number("Briefs must be a number.")
    .int()
    .min(1)
    .max(SYNTHETIC_CONFIG.maxBriefsPerRun),
  cronConfig: cronConfigSchema,
});

export type SyntheticSourceConfig = z.infer<typeof syntheticSourceConfigSchema>;

const syntheticSourceNameSchema = z
  .string()
  .trim()
  .min(1, "Name is required.")
  .max(120);

/** `POST /api/admin/synthetic/sources`. */
export const createSyntheticSourceBodySchema = z.object({
  /** Fake group name; a name already taken returns that source unchanged. */
  name: syntheticSourceNameSchema,
  config: syntheticSourceConfigSchema,
  /** Start the first run now instead of waiting for the cron. */
  collectNow: z.boolean(),
});

export type CreateSyntheticSourceBody = z.infer<typeof createSyntheticSourceBodySchema>;

/** `PATCH /api/admin/synthetic/sources/{id}`. */
export const updateSyntheticSourceBodySchema = z.object({
  name: syntheticSourceNameSchema,
  config: syntheticSourceConfigSchema,
});

export type UpdateSyntheticSourceBody = z.infer<typeof updateSyntheticSourceBodySchema>;

/** The form edits topics one per line and comments as two numbers. */
export const syntheticSourceFormSchema = z
  .object({
    name: syntheticSourceNameSchema,
    enabled: z.boolean(),
    panelId: z.string().min(1, "Pick a panel."),
    topics: z
      .string()
      .max(6000)
      .refine((value) => splitLines(value).length > 0, { error: "Add at least one topic." })
      .refine((value) => splitLines(value).length <= 20, { error: "At most 20 topics." })
      .refine((value) => splitLines(value).every((line) => line.length <= 300), {
        error: "Keep each topic under 300 characters.",
      }),
    postsPerRun: syntheticSourceConfigSchema.shape.postsPerRun,
    minComments: z.number("Min comments must be a number.").int().min(0).max(200),
    maxComments: z.number("Max comments must be a number.").int().min(0).max(200),
    briefsPerRun: syntheticSourceConfigSchema.shape.briefsPerRun,
    cronConfig: cronConfigSchema,
    collectNow: z.boolean(),
  })
  .refine((value) => value.minComments <= value.maxComments, commentRangeRule);

export type SyntheticSourceFormValues = z.infer<typeof syntheticSourceFormSchema>;

export function toSyntheticSourceConfig(values: SyntheticSourceFormValues): SyntheticSourceConfig {
  return {
    enabled: values.enabled,
    panelId: values.panelId,
    topics: splitLines(values.topics),
    postsPerRun: values.postsPerRun,
    commentsPerPost: [values.minComments, values.maxComments],
    briefsPerRun: values.briefsPerRun,
    cronConfig: values.cronConfig,
  };
}

function splitLines(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}
