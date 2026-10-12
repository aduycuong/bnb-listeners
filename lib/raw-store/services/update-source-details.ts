import { eq, sql } from "drizzle-orm";

import { sources } from "@/db/schema";
import { db } from "@/lib/db";

import type { UpdateSourceDetailsParams } from "../types";

/** Refreshes source details seen in a payload; null values keep what is stored. */
export async function updateSourceDetails(
  params: UpdateSourceDetailsParams,
): Promise<void> {
  await db
    .update(sources)
    .set({
      name: sql`coalesce(${params.name ?? null}, ${sources.name})`,
      followerCount: sql`coalesce(${params.followerCount ?? null}::integer, ${sources.followerCount})`,
      memberCount: sql`coalesce(${params.memberCount ?? null}::integer, ${sources.memberCount})`,
      metadata: sql`${sources.metadata} || ${JSON.stringify(params.metadata ?? {})}::jsonb`,
      ...(params.lastCollectedAt && { lastCollectedAt: params.lastCollectedAt }),
    })
    .where(eq(sources.id, params.sourceId));
}
