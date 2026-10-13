import { and, asc, eq, inArray, isNotNull, lte } from "drizzle-orm";

import { contentItems, itemRefreshSchedules } from "@/db/schema";
import { db } from "@/lib/db";

import { COLLECT_CONFIG } from "../config";
import type { FollowUpRun } from "../types";
import { chunk } from "../utils/chunk";
import { createCollectRun } from "./create-collect-run";

const HOUR_MS = 60 * 60 * 1000;

type DispatchDueRefreshesParams = {
  now?: Date;
  /** Max due checkpoints handled in one call. */
  limit?: number;
  sourceId?: string;
  /** Report what would happen; no writes, no Bright Data jobs. */
  dryRun?: boolean;
};

type PlannedRefreshRun = {
  sourceId: string | null;
  posts: number;
  /** Set when the run was created. */
  collectRunId?: string;
};

type DispatchDueRefreshesResult = {
  due: number;
  refreshRuns: PlannedRefreshRun[];
};

/**
 * Hands due comment-refresh checkpoints to `facebook-post-refresh` runs (one
 * per source and chunk). Each run re-reads its posts, then decides which get
 * their comments collected. Dispatched checkpoints are pushed back by
 * `leaseHours` so the next call does not send them again.
 */
export async function dispatchDueRefreshes(
  params: DispatchDueRefreshesParams = {},
): Promise<DispatchDueRefreshesResult> {
  const now = params.now ?? new Date();
  const { postsPerRun, leaseHours } = COLLECT_CONFIG.commentRefresh;

  const due = await db
    .select({
      contentItemId: itemRefreshSchedules.contentItemId,
      sourceId: contentItems.sourceId,
      url: contentItems.url,
    })
    .from(itemRefreshSchedules)
    .innerJoin(contentItems, eq(contentItems.id, itemRefreshSchedules.contentItemId))
    .where(
      and(
        lte(itemRefreshSchedules.nextRefreshAt, now),
        isNotNull(contentItems.url),
        params.sourceId ? eq(contentItems.sourceId, params.sourceId) : undefined,
      ),
    )
    .orderBy(asc(itemRefreshSchedules.nextRefreshAt))
    .limit(params.limit ?? 500);

  const bySource = new Map<string | null, typeof due>();
  for (const row of due) {
    bySource.set(row.sourceId, [...(bySource.get(row.sourceId) ?? []), row]);
  }

  const runs: FollowUpRun[] = [...bySource].flatMap(([sourceId, rows]) =>
    chunk(rows, postsPerRun).map((posts) => ({
      connector: "facebook-post-refresh" as const,
      sourceId,
      params: {
        posts: posts.map((row) => ({ contentItemId: row.contentItemId, url: row.url! })),
      },
    })),
  );

  const summarize = (run: FollowUpRun): PlannedRefreshRun => ({
    sourceId: run.sourceId,
    posts: (run.params.posts as unknown[]).length,
  });

  if (params.dryRun || due.length === 0) {
    return { due: due.length, refreshRuns: runs.map(summarize) };
  }

  await db
    .update(itemRefreshSchedules)
    .set({ nextRefreshAt: new Date(now.getTime() + leaseHours * HOUR_MS) })
    .where(
      inArray(
        itemRefreshSchedules.contentItemId,
        due.map((row) => row.contentItemId),
      ),
    );

  const refreshRuns: PlannedRefreshRun[] = [];
  for (const run of runs) {
    const { collectRunId } = await createCollectRun(run);
    refreshRuns.push({ ...summarize(run), collectRunId });
  }

  return { due: due.length, refreshRuns };
}
