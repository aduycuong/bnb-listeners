import { and, eq, min } from "drizzle-orm";

import { contentItems } from "@/db/schema";
import { db } from "@/lib/db";

import type { GetSourceLatestPublishedAtParams } from "../types";

/** Oldest `published_at` stored for a source, across every origin. */
export async function getSourceEarliestPublishedAt(
  params: GetSourceLatestPublishedAtParams,
): Promise<Date | null> {
  const [row] = await db
    .select({ earliest: min(contentItems.publishedAt) })
    .from(contentItems)
    .where(
      and(
        eq(contentItems.sourceId, params.sourceId),
        params.kind ? eq(contentItems.kind, params.kind) : undefined,
      ),
    );

  return row?.earliest ?? null;
}
