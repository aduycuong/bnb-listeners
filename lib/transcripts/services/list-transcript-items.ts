import { and, asc, eq, inArray, sql } from "drizzle-orm";

import { contentItems } from "@/db/schema";
import { db } from "@/lib/db";

const hasTranscript = sql`exists (select 1 from jsonb_array_elements(${contentItems.media}) m where m->>'type' = 'transcript')`;
const hasUncorrectedTranscript = sql`exists (select 1 from jsonb_array_elements(${contentItems.media}) m where m->>'type' = 'transcript' and m->'correction' is null)`;

/**
 * Ids of items with a transcript: those written by a collect run, or those of
 * some sources. `uncorrectedOnly` keeps those never corrected; a stale
 * correction is found by `correctItemTranscripts`, which knows the glossary.
 */
export async function listTranscriptItems(params: {
  collectRunId?: string;
  sourceIds?: string[];
  uncorrectedOnly?: boolean;
}): Promise<string[]> {
  const rows = await db
    .select({ id: contentItems.id })
    .from(contentItems)
    .where(
      and(
        params.uncorrectedOnly ? hasUncorrectedTranscript : hasTranscript,
        params.collectRunId ? eq(contentItems.collectRunId, params.collectRunId) : undefined,
        params.sourceIds ? inArray(contentItems.sourceId, params.sourceIds) : undefined,
      ),
    )
    .orderBy(asc(contentItems.id));
  return rows.map((row) => row.id);
}
