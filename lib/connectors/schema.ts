import { z } from "zod";

import { ACTIVITY_TIERS } from "./constants";

export const TIER_MODES = ["auto", "manual"] as const;

/** Admin edit of a source (`PATCH /api/admin/sources/{id}`). */
export const updateSourceSettingsBodySchema = z
  .object({
    name: z.string().trim().max(200).nullable(),
    /** `auto`: recomputed after every post run; `manual`: `activityTier` is kept. */
    tierMode: z.enum(TIER_MODES),
    /** Required for `manual`; ignored for `auto`. */
    activityTier: z.enum(ACTIVITY_TIERS).optional(),
    /** Bright Data records per calendar month; null = unlimited. */
    monthlyRecordLimit: z.int().min(0).max(10_000_000).nullable(),
    /** Records per day in Vietnam time, comment runs included; null = unlimited. */
    dailyRecordLimit: z.int().min(0).max(1_000_000).nullable(),
  })
  .refine((value) => value.tierMode === "auto" || value.activityTier !== undefined, {
    error: "Pick a tier for manual mode.",
    path: ["activityTier"],
  });

export type UpdateSourceSettingsBody = z.infer<typeof updateSourceSettingsBodySchema>;

/** Admin source form; an empty limit means unlimited. */
export const sourceSettingsFormSchema = z.object({
  name: z.string().trim().max(200),
  tierMode: z.enum(TIER_MODES),
  activityTier: z.enum(ACTIVITY_TIERS),
  monthlyRecordLimit: z.int().min(0).max(10_000_000).optional(),
  dailyRecordLimit: z.int().min(0).max(1_000_000).optional(),
});

export type SourceSettingsFormValues = z.infer<typeof sourceSettingsFormSchema>;

export const NEW_SOURCE_KINDS = ["facebook", "tiktok-channel", "tiktok-search"] as const;

export type NewSourceKind = (typeof NEW_SOURCE_KINDS)[number];

/**
 * Admin add-source form and body (`POST /api/admin/sources`). Facebook and
 * TikTok channels take a URL; a TikTok keyword search takes a keyword and region.
 */
export const createSourceBodySchema = z
  .object({
    kind: z.enum(NEW_SOURCE_KINDS),
    url: z.string().trim().max(500),
    keyword: z.string().trim().max(200),
    /** ISO 3166-1 alpha-2; empty = the configured search region. */
    region: z
      .string()
      .trim()
      .regex(/^([A-Za-z]{2})?$/, { error: "Use a two-letter country code, e.g. VN." }),
    name: z.string().trim().max(200),
    /** Start the first post run now; the scheduler only picks up sources run once. */
    collectNow: z.boolean(),
  })
  .superRefine((value, ctx) => {
    if (value.kind === "tiktok-search") {
      if (!value.keyword) {
        ctx.addIssue({ code: "custom", path: ["keyword"], message: "Enter a keyword." });
      }
    } else if (!z.url().safeParse(value.url).success) {
      ctx.addIssue({
        code: "custom",
        path: ["url"],
        message: "Enter the full URL, starting with https://.",
      });
    }
  });

export type CreateSourceBody = z.infer<typeof createSourceBodySchema>;

export function toUpdateSourceSettingsBody(
  values: SourceSettingsFormValues,
): UpdateSourceSettingsBody {
  return {
    name: values.name || null,
    tierMode: values.tierMode,
    activityTier: values.tierMode === "manual" ? values.activityTier : undefined,
    monthlyRecordLimit: values.monthlyRecordLimit ?? null,
    dailyRecordLimit: values.dailyRecordLimit ?? null,
  };
}
