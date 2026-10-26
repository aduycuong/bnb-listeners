import { eq } from "drizzle-orm";

import { appSettings } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";

import { isSettingKey } from "../registry";

type ResetSettingParams = {
  key: string;
};

/** Removes the override, so the group goes back to the defaults in code. */
export async function resetSetting(params: ResetSettingParams): Promise<{ key: string }> {
  if (!isSettingKey(params.key)) {
    throw new NotFoundError("setting", params.key);
  }

  await db.delete(appSettings).where(eq(appSettings.key, params.key));
  return { key: params.key };
}
