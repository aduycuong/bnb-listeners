import { and, count, eq, sql } from "drizzle-orm";

import { contentItems } from "@/db/schema";
import { db } from "@/lib/db";

export type SyntheticRunSummary = {
  posts: number;
  comments: number;
  replies: number;
  noiseItems: number;
  /** Briefs the posts were written about. */
  briefs: string[];
};

/** What a synthetic run left in the raw store, read back by `collect_run_id`. */
export async function summarizeSyntheticRun(
  collectRunId: string,
): Promise<SyntheticRunSummary> {
  const rows = await db
    .select({
      kind: contentItems.kind,
      total: count(),
      noise: sql<number>`count(*) filter (where ${contentItems.metadata}->>'noise' is not null)`.mapWith(
        Number,
      ),
    })
    .from(contentItems)
    .where(
      and(
        eq(contentItems.collectRunId, collectRunId),
        eq(contentItems.origin, "synthetic"),
      ),
    )
    .groupBy(contentItems.kind);

  const briefRows = await db
    .selectDistinct({ brief: sql<string | null>`${contentItems.metadata}->>'brief'` })
    .from(contentItems)
    .where(
      and(
        eq(contentItems.collectRunId, collectRunId),
        eq(contentItems.origin, "synthetic"),
        eq(contentItems.kind, "post"),
      ),
    );

  const totalOf = (kind: string) =>
    rows.find((row) => row.kind === kind)?.total ?? 0;

  return {
    posts: totalOf("post"),
    comments: totalOf("comment"),
    replies: totalOf("reply"),
    noiseItems: rows.reduce((sum, row) => sum + row.noise, 0),
    briefs: briefRows.flatMap((row) => (row.brief ? [row.brief] : [])),
  };
}
