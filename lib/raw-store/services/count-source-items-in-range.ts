import { and, count, eq, gte, lte } from "drizzle-orm";

import { contentItems } from "@/db/schema";
import { db } from "@/lib/db";

import type { CountSourceItemsInRangeParams } from "../types";

/** Items of a source published inside `[from, to]`, across every origin. */
export async function countSourceItemsInRange(
  params: CountSourceItemsInRangeParams,
): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(contentItems)
    .where(
      and(
        eq(contentItems.sourceId, params.sourceId),
        params.kind ? eq(contentItems.kind, params.kind) : undefined,
        gte(contentItems.publishedAt, params.from),
        lte(contentItems.publishedAt, params.to),
      ),
    );

  return row?.total ?? 0;
}
