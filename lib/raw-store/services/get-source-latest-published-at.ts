import { and, eq, max } from "drizzle-orm";

import { contentItems } from "@/db/schema";
import { db } from "@/lib/db";

import type { GetSourceLatestPublishedAtParams } from "../types";

/** Newest `published_at` stored for a source, across every origin. */
export async function getSourceLatestPublishedAt(
  params: GetSourceLatestPublishedAtParams,
): Promise<Date | null> {
  const [row] = await db
    .select({ latest: max(contentItems.publishedAt) })
    .from(contentItems)
    .where(
      and(
        eq(contentItems.sourceId, params.sourceId),
        params.kind ? eq(contentItems.kind, params.kind) : undefined,
      ),
    );

  return row?.latest ?? null;
}
