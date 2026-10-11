import { and, eq, inArray, ne } from "drizzle-orm";

import { contentItems } from "@/db/schema";
import { db } from "@/lib/db";
import type { NormalizedContentItem } from "@/lib/raw-store/types";

/**
 * Drops items a connector has already collected: their stored text and
 * engagement are newer than the legacy copy and must not be overwritten.
 */
export async function filterConnectorCollected(
  items: NormalizedContentItem[],
): Promise<NormalizedContentItem[]> {
  if (items.length === 0) return items;

  const rows = await db
    .select({ externalId: contentItems.externalId })
    .from(contentItems)
    .where(
      and(
        eq(contentItems.platform, "facebook"),
        inArray(
          contentItems.externalId,
          items.map((item) => item.externalId),
        ),
        ne(contentItems.origin, "legacy_import"),
      ),
    );

  const collected = new Set(rows.map((row) => row.externalId));
  return items.filter((item) => !collected.has(item.externalId));
}
