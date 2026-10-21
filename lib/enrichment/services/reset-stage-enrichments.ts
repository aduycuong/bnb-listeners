import { sql } from "drizzle-orm";

import { db } from "@/lib/db";

import type { EnricherKey } from "../registry";

/**
 * Puts a stage enricher back to `pending` for every relevant mention of a
 * project that has its input, so the next run redoes it (`--force`). The
 * stage's own output is replaced when it runs.
 */
export async function resetStageEnrichments(params: { projectId: string; key: EnricherKey }): Promise<number> {
  const { rowCount } = await db.execute(sql`
    update mention_enrichments me
    set status = 'pending', error = null, updated_at = now()
    from mentions m
    where m.id = me.mention_id
      and m.project_id = ${params.projectId}
      and m.is_relevant = true
      and me.enricher_key = ${params.key}
      and me.status <> 'pending'
  `);
  return rowCount ?? 0;
}
