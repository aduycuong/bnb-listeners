import { eq } from "drizzle-orm";

import { appSettings, users } from "@/db/schema";
import { db } from "@/lib/db";

import { SETTING_KEYS } from "../registry";
import type { ListSettingsResult } from "../types";
import { resolveSettingValue } from "../utils/resolve-setting-value";

/** Every settings group with its value in use, its default and who changed it last. */
export async function listSettings(): Promise<ListSettingsResult> {
  const rows = await db
    .select({
      key: appSettings.key,
      value: appSettings.value,
      updatedAt: appSettings.updatedAt,
      userId: users.id,
      email: users.email,
      displayName: users.displayName,
    })
    .from(appSettings)
    .leftJoin(users, eq(users.id, appSettings.updatedBy));
  const byKey = new Map(rows.map((row) => [row.key, row]));

  return {
    items: SETTING_KEYS.map((key) => {
      const row = byKey.get(key);
      const resolved = resolveSettingValue(key, row?.value);
      return {
        key,
        value: resolved.value,
        defaultValue: resolved.defaultValue,
        isDefault: resolved.isDefault,
        updatedAt: row?.updatedAt.toISOString() ?? null,
        updatedBy:
          row?.userId && row.email
            ? { id: row.userId, email: row.email, displayName: row.displayName }
            : null,
      };
    }),
  };
}
