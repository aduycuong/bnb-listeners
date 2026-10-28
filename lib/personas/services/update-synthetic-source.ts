import { eq } from "drizzle-orm";

import { sources } from "@/db/schema";
import { InvalidInputError, NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";

import type { UpdateSyntheticSourceBody } from "../schema";
import { loadPanelMembers } from "./load-panel-members";
import {
  type SyncSyntheticSourceScheduleResult,
  syncSyntheticSourceSchedule,
} from "./sync-synthetic-source-schedule";

type UpdateSyntheticSourceParams = UpdateSyntheticSourceBody & {
  id: string;
};

/**
 * Saves the name and schedule config of a synthetic source and syncs its
 * QStash schedule. The external id keeps the original name. Runs already
 * started keep the params they were started with.
 */
export async function updateSyntheticSource(
  params: UpdateSyntheticSourceParams,
): Promise<SyncSyntheticSourceScheduleResult> {
  const [source] = await db
    .select({ origin: sources.origin, metadata: sources.metadata })
    .from(sources)
    .where(eq(sources.id, params.id))
    .limit(1);
  if (!source) {
    throw new NotFoundError("source", params.id);
  }
  if (source.origin !== "synthetic") {
    throw new InvalidInputError("Only synthetic sources have a synthetic schedule.");
  }

  const members = await loadPanelMembers(params.config.panelId);
  if (members.length === 0) {
    throw new NotFoundError("persona panel members", params.config.panelId);
  }

  await db
    .update(sources)
    .set({
      name: params.name,
      metadata: { ...source.metadata, synthetic: true, syntheticConfig: params.config },
      activityTierLocked: true,
    })
    .where(eq(sources.id, params.id));

  return syncSyntheticSourceSchedule(params.id);
}
