import { and, asc, eq, inArray, isNotNull, lte, notInArray } from "drizzle-orm";

import { contentItems, itemRefreshSchedules } from "@/db/schema";
import { db } from "@/lib/db";

import { COLLECT_CONFIG } from "../config";
import type { FollowUpRun } from "../types";
import { planRefreshRuns } from "../utils/plan-refresh-runs";
import { createCollectRun } from "./create-collect-run";

const HOUR_MS = 60 * 60 * 1000;

type DispatchDueRefreshesParams = {
  now?: Date;
  /** Max due checkpoints handled in one call. */
  limit?: number;
  sourceId?: string;
  /** Sources to leave alone, e.g. out of monthly budget. */
  excludeSourceIds?: string[];
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
 * Hands due comment-refresh checkpoints to post-refresh runs of the post's
 * platform (one per platform, source and chunk). Each run re-reads its posts,
 * then decides which get their comments collected. Dispatched checkpoints are
 * pushed back by `leaseHours` so the next call does not send them again.
 */
export async function dispatchDueRefreshes(
  params: DispatchDueRefreshesParams = {},
): Promise<DispatchDueRefreshesResult> {
  const now = params.now ?? new Date();
  const { leaseHours } = COLLECT_CONFIG.commentRefresh;

  const due = await db
    .select({
      contentItemId: itemRefreshSchedules.contentItemId,
      sourceId: contentItems.sourceId,
      platform: contentItems.platform,
      externalId: contentItems.externalId,
      url: contentItems.url,
    })
    .from(itemRefreshSchedules)
    .innerJoin(contentItems, eq(contentItems.id, itemRefreshSchedules.contentItemId))
    .where(
      and(
        lte(itemRefreshSchedules.nextRefreshAt, now),
        isNotNull(contentItems.url),
        params.sourceId ? eq(contentItems.sourceId, params.sourceId) : undefined,
        params.excludeSourceIds?.length
          ? notInArray(contentItems.sourceId, params.excludeSourceIds)
          : undefined,
      ),
    )
    .orderBy(asc(itemRefreshSchedules.nextRefreshAt))
    .limit(params.limit ?? 500);

  const runs: FollowUpRun[] = planRefreshRuns(
    due.map((row) => ({ ...row, url: row.url! })),
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
