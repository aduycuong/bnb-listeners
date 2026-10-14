import { and, count, eq } from "drizzle-orm";

import { contentItems, sources } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";

import type {
  DeleteSourceContentItemsParams,
  DeleteSourceContentItemsResult,
} from "../types";

/**
 * Deletes the content items (posts, comments, replies) of one source,
 * optionally only those of one origin. The source, its authors and its
 * collect runs stay. Engagement snapshots and refresh schedules go with the
 * items (cascade). With `dryRun` only the counts are returned.
 */
export async function deleteSourceContentItems(
  params: DeleteSourceContentItemsParams,
): Promise<DeleteSourceContentItemsResult> {
  const [source] = await db
    .select({ id: sources.id, name: sources.name })
    .from(sources)
    .where(eq(sources.id, params.sourceId))
    .limit(1);

  if (!source) throw new NotFoundError("source", params.sourceId);

  const where = and(
    eq(contentItems.sourceId, params.sourceId),
    params.origin ? eq(contentItems.origin, params.origin) : undefined,
  );

  const groups = await db
    .select({
      kind: contentItems.kind,
      origin: contentItems.origin,
      count: count(),
    })
    .from(contentItems)
    .where(where)
    .groupBy(contentItems.kind, contentItems.origin);

  const total = groups.reduce((sum, group) => sum + group.count, 0);

  if (!params.dryRun && total > 0) {
    await db.delete(contentItems).where(where);
  }

  return {
    sourceName: source.name,
    groups,
    total,
    deleted: params.dryRun ? 0 : total,
  };
}
