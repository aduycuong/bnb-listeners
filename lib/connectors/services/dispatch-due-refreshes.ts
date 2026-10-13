import { and, asc, eq, inArray, lte } from "drizzle-orm";

import { contentItems, itemRefreshSchedules } from "@/db/schema";
import { db } from "@/lib/db";

import { COLLECT_CONFIG } from "../config";
import type { FollowUpRun } from "../types";
import { chunk } from "../utils/chunk";
import { createCollectRun } from "./create-collect-run";
import {
  processRefreshCheckpoints,
  type RefreshDecision,
} from "./process-refresh-checkpoints";

const HOUR_MS = 60 * 60 * 1000;

type DispatchDueRefreshesParams = {
  now?: Date;
  /** Max due checkpoints handled in one call. */
  limit?: number;
  sourceId?: string;
  /** Report what would happen; no writes, no Bright Data jobs. */
  dryRun?: boolean;
};

type PlannedRun = {
  sourceId: string | null;
  posts: number;
  /** Set when the run was created. */
  collectRunId?: string;
};

type DispatchDueRefreshesResult = {
  due: number;
  /** Posts decided from the post run's fresh `comment_count`, without a refresh. */
  decidedDirectly: RefreshDecision[];
  refreshRuns: PlannedRun[];
  commentRuns: PlannedRun[];
};

/**
 * Handles due comment-refresh checkpoints. Posts added by a post run within
 * `postRunFreshHours` already have a current `comment_count` and are decided
 * now; the rest are re-read by `facebook-post-refresh` runs (one per source
 * and chunk), which decide when their result arrives.
 */
export async function dispatchDueRefreshes(
  params: DispatchDueRefreshesParams = {},
): Promise<DispatchDueRefreshesResult> {
  const now = params.now ?? new Date();
  const config = COLLECT_CONFIG.commentRefresh;

  const due = await db
    .select({
      contentItemId: itemRefreshSchedules.contentItemId,
      sourceId: contentItems.sourceId,
      url: contentItems.url,
      firstSeenAt: contentItems.firstSeenAt,
    })
    .from(itemRefreshSchedules)
    .innerJoin(contentItems, eq(contentItems.id, itemRefreshSchedules.contentItemId))
    .where(
      and(
        lte(itemRefreshSchedules.nextRefreshAt, now),
        params.sourceId ? eq(contentItems.sourceId, params.sourceId) : undefined,
      ),
    )
    .orderBy(asc(itemRefreshSchedules.nextRefreshAt))
    .limit(params.limit ?? 500);

  const freshSince = now.getTime() - config.postRunFreshHours * HOUR_MS;
  // A post without a URL cannot be re-read; it is moved on with what is stored.
  const direct = due.filter((row) => !row.url || row.firstSeenAt.getTime() >= freshSince);
  const toRefresh = due.filter((row) => !direct.includes(row));

  const { decisions, followUps } = await processRefreshCheckpoints({
    contentItemIds: direct.map((row) => row.contentItemId),
    now,
    dryRun: params.dryRun,
  });

  const refreshRuns: FollowUpRun[] = [...groupBySource(toRefresh)].flatMap(
    ([sourceId, rows]) =>
      chunk(rows, config.postsPerRun).map((posts) => ({
        connector: "facebook-post-refresh" as const,
        sourceId,
        params: {
          posts: posts.map((row) => ({
            contentItemId: row.contentItemId,
            url: row.url!,
          })),
        },
      })),
  );

  if (params.dryRun) {
    return {
      due: due.length,
      decidedDirectly: decisions,
      refreshRuns: refreshRuns.map(summarize),
      commentRuns: followUps.map(summarize),
    };
  }

  if (toRefresh.length > 0) {
    await db
      .update(itemRefreshSchedules)
      .set({ nextRefreshAt: new Date(now.getTime() + config.leaseHours * HOUR_MS) })
      .where(
        inArray(
          itemRefreshSchedules.contentItemId,
          toRefresh.map((row) => row.contentItemId),
        ),
      );
  }

  return {
    due: due.length,
    decidedDirectly: decisions,
    refreshRuns: await startRuns(refreshRuns),
    commentRuns: await startRuns(followUps),
  };
}

function groupBySource<T extends { sourceId: string | null }>(rows: T[]) {
  const groups = new Map<string | null, T[]>();
  for (const row of rows) {
    groups.set(row.sourceId, [...(groups.get(row.sourceId) ?? []), row]);
  }
  return groups;
}

function summarize(run: FollowUpRun): PlannedRun {
  const { posts, postUrls } = run.params as { posts?: unknown[]; postUrls?: unknown[] };
  return { sourceId: run.sourceId, posts: (posts ?? postUrls ?? []).length };
}

async function startRuns(runs: FollowUpRun[]): Promise<PlannedRun[]> {
  const started: PlannedRun[] = [];
  for (const run of runs) {
    const { collectRunId } = await createCollectRun(run);
    started.push({ ...summarize(run), collectRunId });
  }
  return started;
}
