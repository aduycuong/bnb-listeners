import { and, desc, eq, isNotNull, max, sql } from "drizzle-orm";

import { contentItems } from "@/db/schema";
import { db } from "@/lib/db";

/** Briefs of the newest synthetic posts of a source, newest first, without repeats. */
export async function loadRecentBriefs(sourceId: string, limit: number): Promise<string[]> {
  const brief = sql<string>`${contentItems.metadata}->>'brief'`;

  const rows = await db
    .select({ brief, latest: max(contentItems.publishedAt) })
    .from(contentItems)
    .where(
      and(
        eq(contentItems.sourceId, sourceId),
        eq(contentItems.kind, "post"),
        eq(contentItems.origin, "synthetic"),
        isNotNull(brief),
      ),
    )
    .groupBy(brief)
    .orderBy(desc(max(contentItems.publishedAt)))
    .limit(limit);

  return rows.map((row) => row.brief);
}
