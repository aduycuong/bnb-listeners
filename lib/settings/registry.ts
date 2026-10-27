import type { z } from "zod";

import {
  collectCommentRefreshSetting,
  collectTiersSetting,
  collectTiktokSearchSetting,
} from "@/lib/connectors/settings";
import { spendingPricingSetting } from "@/lib/spending/settings";

import type { SettingDefinition } from "./types";

/**
 * Every settings group an admin can edit, in the order `/admin/settings`
 * shows them. To add one: declare a `SettingDefinition` next to the module
 * that uses it, add it here, and read it with `getSettings`. The form is
 * built from `fields`, so no UI code is needed for numbers and number lists.
 */
export const SETTINGS = {
  "collect-tiers": collectTiersSetting,
  "collect-tiktok-search": collectTiktokSearchSetting,
  "collect-comment-refresh": collectCommentRefreshSetting,
  "spending-pricing": spendingPricingSetting,
} as const satisfies Record<string, SettingDefinition>;

export type SettingKey = keyof typeof SETTINGS;

export type SettingValue<K extends SettingKey> = z.infer<(typeof SETTINGS)[K]["schema"]>;

export const SETTING_KEYS = Object.keys(SETTINGS) as SettingKey[];

export function isSettingKey(key: string): key is SettingKey {
  return Object.hasOwn(SETTINGS, key);
}
