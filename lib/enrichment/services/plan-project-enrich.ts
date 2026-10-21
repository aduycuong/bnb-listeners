import { and, eq, exists, sql } from "drizzle-orm";

import { mentionEnrichments, mentions } from "@/db/schema";
import { db } from "@/lib/db";

import type { EnrichRunOptions, PlanProjectEnrichResult } from "../types";
import { pendingPairsSql, selectLlmEnrichers } from "../utils/pending-enrichments-sql";
import { loadEnrichContext } from "./load-enrich-context";

/**
 * Lists threads with relevant mentions that need at least one LLM enricher of
 * the run (D18). Mentions that are no longer relevant lose their enrichment
 * state so they run again if they become relevant.
 */
export async function planProjectEnrich(
  params: { projectId: string } & EnrichRunOptions,
): Promise<PlanProjectEnrichResult> {
  const ctx = await loadEnrichContext({ projectId: params.projectId });
  const enrichers = selectLlmEnrichers(ctx, params);

  await db
    .delete(mentionEnrichments)
    .where(
      exists(
        db
          .select({ id: mentions.id })
          .from(mentions)
          .where(
            and(
              eq(mentions.id, mentionEnrichments.mentionId),
              eq(mentions.projectId, params.projectId),
              eq(mentions.isRelevant, false),
            ),
          ),
      ),
    );

  if (enrichers.length === 0) return { rootIds: [], pending: 0, pendingByKey: {}, keys: [] };

  const { rows } = await db.execute<{ root_id: string; key: string; count: number }>(
    sql`${pendingPairsSql({
      projectId: params.projectId,
      enrichers,
      force: params.force,
      select: sql`coalesce(m.root_item_id, m.content_item_id) as root_id, k.key, count(*)::int as count`,
    })} group by 1, 2`,
  );

  const pendingByKey: Record<string, number> = {};
  let pending = 0;
  for (const row of rows) {
    pendingByKey[row.key] = (pendingByKey[row.key] ?? 0) + row.count;
    pending += row.count;
  }

  return {
    rootIds: [...new Set(rows.map((row) => row.root_id))],
    pending,
    pendingByKey,
    keys: enrichers.map((enricher) => enricher.key),
  };
}
