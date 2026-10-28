import { eq } from "drizzle-orm";

import { sources } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import type { CreateSourceResult } from "@/lib/connectors/types";
import { db } from "@/lib/db";

import type { CreateSyntheticSourceBody } from "../schema";
import { loadPanelMembers } from "./load-panel-members";
import { registerSyntheticSource } from "./register-synthetic-source";
import { runSyntheticSource } from "./run-synthetic-source";
import { syncSyntheticSourceSchedule } from "./sync-synthetic-source-schedule";

/**
 * Registers a synthetic group that writes on its own: the config goes into
 * `sources.metadata`, the QStash schedule is created, and the first run starts
 * when asked. A name already taken returns that source untouched. A first run
 * that fails to start leaves the source and its schedule in place.
 */
export async function createSyntheticSource(
  params: CreateSyntheticSourceBody,
): Promise<CreateSourceResult> {
  const members = await loadPanelMembers(params.config.panelId);
  if (members.length === 0) {
    throw new NotFoundError("persona panel members", params.config.panelId);
  }

  const { sourceId, created } = await registerSyntheticSource({ name: params.name });
  if (!created) {
    return { sourceId, created, collectRunId: null, collectError: null };
  }

  await db
    .update(sources)
    .set({
      metadata: { synthetic: true, syntheticConfig: params.config },
      // Synthetic runs never recompute the tier; paused stops the schedule.
      activityTierLocked: true,
    })
    .where(eq(sources.id, sourceId));
  await syncSyntheticSourceSchedule(sourceId);

  if (!params.collectNow) {
    return { sourceId, created, collectRunId: null, collectError: null };
  }

  try {
    const run = await runSyntheticSource({ id: sourceId });
    return { sourceId, created, collectRunId: run.collectRunId, collectError: null };
  } catch (error) {
    console.error("[synthetic] first run did not start", { sourceId, error });
    return {
      sourceId,
      created,
      collectRunId: null,
      collectError: error instanceof Error ? error.message : "Could not start the first run.",
    };
  }
}
