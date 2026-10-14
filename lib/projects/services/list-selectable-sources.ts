import { asc, count, eq, sql } from "drizzle-orm";

import { contentItems, sources } from "@/db/schema";
import { db } from "@/lib/db";

import type { ListSelectableSourcesResult } from "../types";

/** Sources in the shared raw store that a project can follow, with their post counts. */
export async function listSelectableSources(): Promise<ListSelectableSourcesResult> {
  const postCounts = db
    .select({ sourceId: contentItems.sourceId, posts: count().as("posts") })
    .from(contentItems)
    .where(eq(contentItems.kind, "post"))
    .groupBy(contentItems.sourceId)
    .as("post_counts");

  const rows = await db
    .select({
      id: sources.id,
      platform: sources.platform,
      sourceType: sources.sourceType,
      name: sources.name,
      url: sources.url,
      origin: sources.origin,
      memberCount: sources.memberCount,
      postCount: sql<number>`coalesce(${postCounts.posts}, 0)`.mapWith(Number),
      lastCollectedAt: sources.lastCollectedAt,
    })
    .from(sources)
    .leftJoin(postCounts, eq(postCounts.sourceId, sources.id))
    .orderBy(asc(sources.origin), asc(sources.name));

  return {
    items: rows.map((row) => ({
      ...row,
      lastCollectedAt: row.lastCollectedAt?.toISOString() ?? null,
    })),
  };
}
