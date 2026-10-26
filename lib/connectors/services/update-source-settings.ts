import { eq } from "drizzle-orm";

import { sources } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";

import type { ActivityTier } from "../constants";
import type { UpdateSourceSettingsBody } from "../schema";
import { recomputeSourceActivityTier } from "./recompute-source-activity-tier";

type UpdateSourceSettingsParams = UpdateSourceSettingsBody & {
  id: string;
};

type UpdateSourceSettingsResult = {
  id: string;
  activityTier: ActivityTier;
  activityTierLocked: boolean;
};

/**
 * Admin edit of a source's name, tier mode and monthly and daily budgets. A manual tier
 * is pinned (`activity_tier_locked`); switching back to automatic recomputes
 * the tier right away instead of waiting for the next post run. Paused is
 * only ever manual.
 */
export async function updateSourceSettings(
  params: UpdateSourceSettingsParams,
): Promise<UpdateSourceSettingsResult> {
  const manual = params.tierMode === "manual";

  const [updated] = await db
    .update(sources)
    .set({
      name: params.name || null,
      monthlyRecordLimit: params.monthlyRecordLimit,
      dailyRecordLimit: params.dailyRecordLimit,
      activityTierLocked: manual,
      ...(manual && { activityTier: params.activityTier }),
    })
    .where(eq(sources.id, params.id))
    .returning({ activityTier: sources.activityTier });

  if (!updated) {
    throw new NotFoundError("source", params.id);
  }

  if (manual) {
    return {
      id: params.id,
      activityTier: updated.activityTier as ActivityTier,
      activityTierLocked: true,
    };
  }

  const { activityTier } = await recomputeSourceActivityTier({ sourceId: params.id, force: true });
  return { id: params.id, activityTier, activityTierLocked: false };
}
