import { inArray } from "drizzle-orm";

import { appSettings } from "@/db/schema";
import { db } from "@/lib/db";

import type { SettingKey, SettingValue } from "../registry";
import { resolveSettingValue } from "../utils/resolve-setting-value";

/** Values in use of the given groups: admin overrides over the code defaults. */
export async function getSettings<K extends SettingKey>(
  keys: readonly K[],
): Promise<{ [P in K]: SettingValue<P> }> {
  const rows = await db
    .select({ key: appSettings.key, value: appSettings.value })
    .from(appSettings)
    .where(inArray(appSettings.key, [...keys]));
  const stored = new Map(rows.map((row) => [row.key, row.value]));

  return Object.fromEntries(
    keys.map((key) => [key, resolveSettingValue(key, stored.get(key)).value]),
  ) as { [P in K]: SettingValue<P> };
}
