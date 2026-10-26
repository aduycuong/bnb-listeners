import { appSettings } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";

import { isSettingKey, SETTINGS } from "../registry";

type UpdateSettingParams = {
  key: string;
  /** The whole group; validated by the group's schema (a ZodError is a 400). */
  value: unknown;
  userId: string;
};

/** Stores an admin override of one settings group. */
export async function updateSetting(params: UpdateSettingParams): Promise<{ key: string }> {
  if (!isSettingKey(params.key)) {
    throw new NotFoundError("setting", params.key);
  }

  const value = SETTINGS[params.key].schema.parse(params.value) as Record<string, unknown>;

  await db
    .insert(appSettings)
    .values({ key: params.key, value, updatedBy: params.userId })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value, updatedBy: params.userId, updatedAt: new Date() },
    });

  return { key: params.key };
}
