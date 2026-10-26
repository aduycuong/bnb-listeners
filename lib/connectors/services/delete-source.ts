import { and, eq, inArray, isNull, sql } from "drizzle-orm";

import { collectRuns, contentItems, projects, projectSources, sources } from "@/db/schema";
import { InvalidInputError, NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import { syncProjectMatch } from "@/lib/matching/services/sync-project-match";
import {
  MAX_DELETE_CONTENT_ITEMS,
  deleteContentItems,
} from "@/lib/raw-store/services/delete-content-items";

import type { DeleteSourceResult } from "../types";

type DeleteSourceParams = {
  id: string;
};

/**
 * Deletes a connector source with its posts, comments and replies (and,
 * through them, mentions and the rest of their analysis). Collect runs stay
 * with `source_id` cleared, so past provider usage still counts in the
 * overview. Projects that followed the source lose it, get a new
 * `config_version`, and re-match when their match signature changed.
 *
 * Refused while a run of the source is pending or running: its webhook would
 * land on a deleted source.
 */
export async function deleteSource(params: DeleteSourceParams): Promise<DeleteSourceResult> {
  const [source] = await db
    .select({ id: sources.id, origin: sources.origin })
    .from(sources)
    .where(eq(sources.id, params.id))
    .limit(1);
  if (!source) {
    throw new NotFoundError("source", params.id);
  }
  if (source.origin !== "connector") {
    throw new InvalidInputError(
      `Only connector sources can be deleted here (this one is ${source.origin}).`,
    );
  }

  const [active] = await db
    .select({ id: collectRuns.id })
    .from(collectRuns)
    .where(
      and(eq(collectRuns.sourceId, source.id), inArray(collectRuns.status, ["pending", "running"])),
    )
    .limit(1);
  if (active) {
    throw new InvalidInputError(
      "A collect run of this source is still pending or running; wait for it to finish.",
    );
  }

  const linked = await db
    .select({ projectId: projectSources.projectId })
    .from(projectSources)
    .where(eq(projectSources.sourceId, source.id));
  const projectIds = linked.map((row) => row.projectId);

  // Posts first, so each batch takes its thread along; then whatever is left.
  let deletedContentItems = 0;
  for (const rootsOnly of [true, false]) {
    for (;;) {
      const batch = await db
        .select({ id: contentItems.id })
        .from(contentItems)
        .where(
          rootsOnly
            ? and(eq(contentItems.sourceId, source.id), isNull(contentItems.parentId))
            : eq(contentItems.sourceId, source.id),
        )
        .limit(MAX_DELETE_CONTENT_ITEMS);
      if (batch.length === 0) break;

      const result = await deleteContentItems({ ids: batch.map((row) => row.id) });
      deletedContentItems += result.deleted;
      if (result.deleted === 0) break;
    }
  }

  // `project_sources` rows go with the source (ON DELETE CASCADE).
  await db.delete(sources).where(eq(sources.id, source.id));

  if (projectIds.length > 0) {
    await db
      .update(projects)
      .set({ configVersion: sql`${projects.configVersion} + 1`, updatedAt: new Date() })
      .where(inArray(projects.id, projectIds));
    await Promise.all(projectIds.map((projectId) => syncProjectMatch({ projectId })));
  }

  return { sourceId: source.id, deletedContentItems, projectIds };
}
