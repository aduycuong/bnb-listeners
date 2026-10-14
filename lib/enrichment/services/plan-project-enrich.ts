import { and, eq, ne, or, sql } from "drizzle-orm";

import { contentItems, mentions } from "@/db/schema";
import { db } from "@/lib/db";

import type { PlanProjectEnrichResult } from "../types";
import { loadEnrichContext } from "./load-enrich-context";

/**
 * Lists threads with relevant mentions that are new, changed, failed or
 * enriched under another signature. Mentions that are not relevant are
 * marked `skipped`.
 */
export async function planProjectEnrich(params: {
  projectId: string;
}): Promise<PlanProjectEnrichResult> {
  const ctx = await loadEnrichContext({ projectId: params.projectId });

  const skipped = await db
    .update(mentions)
    .set({ enrichStatus: "skipped", updatedAt: new Date() })
    .where(
      and(
        eq(mentions.projectId, params.projectId),
        eq(mentions.isRelevant, false),
        ne(mentions.enrichStatus, "skipped"),
      ),
    )
    .returning({ id: mentions.id });

  const pending = await db
    .select({ rootId: mentions.rootItemId, contentItemId: mentions.contentItemId })
    .from(mentions)
    .innerJoin(contentItems, eq(contentItems.id, mentions.contentItemId))
    .where(
      and(
        eq(mentions.projectId, params.projectId),
        eq(mentions.isRelevant, true),
        or(
          ne(mentions.enrichStatus, "done"),
          sql`${mentions.enrichSignature} is distinct from ${ctx.signature}`,
          sql`${mentions.enrichedContentHash} is distinct from ${contentItems.contentHash}`,
        ),
      ),
    );

  return {
    signature: ctx.signature,
    rootIds: [...new Set(pending.map((row) => row.rootId ?? row.contentItemId))],
    pending: pending.length,
    skipped: skipped.length,
  };
}
