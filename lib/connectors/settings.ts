import { z } from "zod";

import type { SettingDefinition } from "@/lib/settings/types";

import { COLLECT_CONFIG } from "./config";

/**
 * Collection settings an admin can change in `/admin/settings`. Defaults come
 * from `COLLECT_CONFIG`; services read the values in use through
 * `getCollectSettings`.
 */

const intervalHoursSchema = z.int().min(1).max(168);

const collectTiersSchema = z.object({
  intervalHours: z
    .object({
      hot: intervalHoursSchema,
      normal: intervalHoursSchema,
      low: intervalHoursSchema,
    })
    .refine((value) => value.hot <= value.normal && value.normal <= value.low, {
      error: "Intervals must not get shorter from hot to normal to low.",
      path: ["low"],
    }),
  minPostsPerDay: z
    .object({
      hot: z.number().positive().max(10_000),
      normal: z.number().positive().max(10_000),
    })
    .refine((value) => value.hot > value.normal, {
      error: "The hot threshold must be above the normal threshold.",
      path: ["hot"],
    }),
  windowDays: z.int().min(1).max(30),
});

const collectTiktokSearchSchema = z.object({
  intervalHours: intervalHoursSchema,
});

const collectCommentRefreshSchema = z.object({
  checkpointsHours: z
    .array(z.int().min(1).max(24 * 30))
    .min(1)
    .max(10)
    .refine((hours) => hours.every((value, index) => index === 0 || value > hours[index - 1]!), {
      error: "Checkpoints must be in ascending order without duplicates.",
    }),
});

export const collectTiersSetting = {
  label: "Activity tiers",
  description:
    "How often channels and groups are scanned for new posts, and how the automatic tier is picked from posts per day. Sources with a manual tier keep it; their interval still comes from here.",
  schema: collectTiersSchema,
  defaultValue: {
    intervalHours: { ...COLLECT_CONFIG.tiers.intervalHours },
    minPostsPerDay: { ...COLLECT_CONFIG.tiers.minPostsPerDay },
    windowDays: COLLECT_CONFIG.tiers.windowDays,
  },
  fields: [
    { path: "intervalHours.hot", label: "Hot: hours between scans", unit: "h", kind: "number" },
    { path: "intervalHours.normal", label: "Normal: hours between scans", unit: "h", kind: "number" },
    { path: "intervalHours.low", label: "Low: hours between scans", unit: "h", kind: "number" },
    {
      path: "minPostsPerDay.hot",
      label: "Hot from",
      description: "Automatic tier is hot at or above this many posts per day.",
      unit: "posts/day",
      kind: "number",
    },
    {
      path: "minPostsPerDay.normal",
      label: "Normal from",
      description: "Automatic tier is normal at or above this; below it is low.",
      unit: "posts/day",
      kind: "number",
    },
    {
      path: "windowDays",
      label: "Measured over",
      description: "Posts per day are averaged over this many days (a newer source: over what it has).",
      unit: "days",
      kind: "number",
    },
  ],
} satisfies SettingDefinition<typeof collectTiersSchema>;

export const collectTiktokSearchSetting = {
  label: "TikTok keyword search",
  description:
    "A keyword search has no posts per day to measure, so it runs at a fixed interval whatever its tier. Each run is a different sample of the last day.",
  schema: collectTiktokSearchSchema,
  defaultValue: { intervalHours: COLLECT_CONFIG.tiktok.search.intervalHours },
  fields: [{ path: "intervalHours", label: "Hours between runs", unit: "h", kind: "number" }],
} satisfies SettingDefinition<typeof collectTiktokSearchSchema>;

export const collectCommentRefreshSetting = {
  label: "Post refresh checkpoints",
  description:
    "Hours after a post is published at which its comment count is re-read and comments may be collected again. Changes apply from each post's next checkpoint; a post already waiting keeps its current one.",
  schema: collectCommentRefreshSchema,
  defaultValue: { checkpointsHours: [...COLLECT_CONFIG.commentRefresh.checkpointsHours] },
  fields: [
    {
      path: "checkpointsHours",
      label: "Checkpoints",
      description: "Comma separated, ascending, e.g. 6, 24, 72.",
      unit: "h after publish",
      kind: "number-list",
    },
  ],
} satisfies SettingDefinition<typeof collectCommentRefreshSchema>;

export type CollectSettings = {
  tiers: z.infer<typeof collectTiersSchema>;
  tiktokSearch: z.infer<typeof collectTiktokSearchSchema>;
  commentRefresh: z.infer<typeof collectCommentRefreshSchema>;
};

/** Defaults, for tests and callers that must not read the database. */
export const DEFAULT_COLLECT_SETTINGS: CollectSettings = {
  tiers: collectTiersSetting.defaultValue,
  tiktokSearch: collectTiktokSearchSetting.defaultValue,
  commentRefresh: collectCommentRefreshSetting.defaultValue,
};
