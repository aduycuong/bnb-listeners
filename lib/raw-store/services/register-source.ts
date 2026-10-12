import { sql } from "drizzle-orm";

import { sources } from "@/db/schema";
import { db } from "@/lib/db";

import type { RegisterSourceParams, RegisterSourceResult } from "../types";

/** Inserts the source or returns the existing one for `(platform, external_id)`. */
export async function registerSource(
  params: RegisterSourceParams,
): Promise<RegisterSourceResult> {
  const [row] = await db
    .insert(sources)
    .values({
      platform: params.platform,
      sourceType: params.sourceType,
      externalId: params.externalId,
      url: params.url ?? null,
      name: params.name ?? null,
      origin: params.origin ?? "connector",
      metadata: params.metadata ?? {},
    })
    .onConflictDoUpdate({
      target: [sources.platform, sources.externalId],
      set: {
        url: sql`coalesce(${sources.url}, excluded.url)`,
        name: sql`coalesce(${sources.name}, excluded.name)`,
      },
    })
    .returning({
      id: sources.id,
      // xmax = 0 only for a freshly inserted row.
      created: sql<boolean>`(xmax = 0)`,
    });

  return { sourceId: row.id, created: row.created };
}
