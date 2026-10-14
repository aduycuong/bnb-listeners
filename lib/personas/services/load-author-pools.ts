import { and, eq, inArray } from "drizzle-orm";

import { authors } from "@/db/schema";
import { db } from "@/lib/db";

import type { PlannedAuthor } from "../types";

/**
 * Existing synthetic authors grouped by persona id, so new threads can reuse
 * a name. Authors from earlier runs of any panel count.
 */
export async function loadAuthorPools(
  personaIds: string[],
): Promise<Map<string, PlannedAuthor[]>> {
  const pools = new Map<string, PlannedAuthor[]>(
    personaIds.map((id) => [id, []]),
  );
  if (personaIds.length === 0) return pools;

  const rows = await db
    .select({
      personaId: authors.personaId,
      externalId: authors.externalId,
      name: authors.name,
      followerCount: authors.followerCount,
    })
    .from(authors)
    .where(
      and(
        eq(authors.origin, "synthetic"),
        inArray(authors.personaId, personaIds),
      ),
    );

  for (const row of rows) {
    if (!row.personaId) continue;
    pools.get(row.personaId)?.push({
      externalId: row.externalId,
      name: row.name ?? row.externalId,
      personaId: row.personaId,
      followerCount: row.followerCount ?? 0,
    });
  }

  return pools;
}
