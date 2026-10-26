import { and, eq } from "drizzle-orm";

import { contentItems, itemRefreshSchedules } from "@/db/schema";
import { db } from "@/lib/db";

import type { CollectSettings } from "../settings";
import type { FollowUpRun } from "../types";
import { COLLECT_CONFIG } from "../config";
import { decideCommentCollection } from "../utils/decide-comment-collection";
import { fitCommentBudget } from "../utils/fit-comment-budget";
import { findNextRefreshCheckpoint } from "../utils/find-next-refresh-checkpoint";
import { planCommentRuns } from "../utils/plan-comment-runs";
import { getCollectSettings } from "./get-collect-settings";
import { getSourceBudgets } from "./get-source-budgets";

const HOUR_MS = 60 * 60 * 1000;

type CreateItemRefreshSchedulesParams = {
  /** Posts written by this run (all new, since post runs skip known posts). */
  collectRunId: string;
  now?: Date;
  /** Loaded when missing. */
  settings?: CollectSettings;
};

type CreateItemRefreshSchedulesResult = {
  schedulesCreated: number;
  postsToCollect: number;
  /** Posts that passed the rules but did not fit the source's budget; judged again at their next checkpoint. */
  commentsDeferredForBudget: number;
  /** Comment runs for posts that pass the rules right away. */
  followUps: FollowUpRun[];
};

/**
 * The post run's `num_comments` is fresh, so new posts are judged right away
 * with the comment-collection rules, then scheduled for their next checkpoint
 * after `published_at`. A post past every checkpoint gets no schedule.
 *
 * Comment collections must fit the source's remaining monthly and daily
 * budget (`fitCommentBudget`); the rest wait for their next checkpoint.
 *
 * Decisions depend on the stored posts and the budget, so a retried step
 * plans the same comment runs unless other runs used budget in between;
 * existing schedules are kept.
 */
export async function createItemRefreshSchedules(
  params: CreateItemRefreshSchedulesParams,
): Promise<CreateItemRefreshSchedulesResult> {
  const now = params.now ?? new Date();
  const { checkpointsHours } = (params.settings ?? (await getCollectSettings())).commentRefresh;

  const posts = await db
    .select({
      id: contentItems.id,
      sourceId: contentItems.sourceId,
      platform: contentItems.platform,
      externalId: contentItems.externalId,
      url: contentItems.url,
      commentCount: contentItems.commentCount,
      publishedAt: contentItems.publishedAt,
      firstSeenAt: contentItems.firstSeenAt,
    })
    .from(contentItems)
    .where(
      and(
        eq(contentItems.collectRunId, params.collectRunId),
        eq(contentItems.kind, "post"),
      ),
    );

  const planned = posts.map((post) => {
    const publishedAt = post.publishedAt ?? post.firstSeenAt;
    const collect = post.url
      ? decideCommentCollection({
          numComments: post.commentCount,
          collectedCount: null,
          ageHours: (now.getTime() - publishedAt.getTime()) / HOUR_MS,
        })
      : null;

    return { post, collect, next: findNextRefreshCheckpoint({ publishedAt, now, checkpointsHours }) };
  });

  const candidates = planned.filter((item) => item.collect && item.post.url);
  const budgetSourceIds = [
    ...new Set(candidates.flatMap((item) => (item.post.sourceId ? [item.post.sourceId] : []))),
  ];
  const budgets =
    budgetSourceIds.length > 0 ? await getSourceBudgets({ sourceIds: budgetSourceIds, now }) : [];
  const { deferred } = fitCommentBudget(
    candidates.map((item) => ({
      item,
      sourceId: item.post.sourceId,
      numComments: item.post.commentCount,
    })),
    new Map(budgets.map((budget) => [budget.sourceId, budget.remaining])),
    COLLECT_CONFIG.commentRefresh.maxRowsPerPost,
  );
  for (const { item } of deferred) {
    item.collect = null;
  }

  // Without a URL the post cannot be re-read, so it gets no schedule.
  const rows = planned.flatMap(({ post, collect, next }) =>
    next && post.url
      ? [
          {
            contentItemId: post.id,
            checkpointHours: next.checkpointHours,
            nextRefreshAt: next.dueAt,
            ...(collect && {
              commentsCollectedCount: post.commentCount,
              commentsCollectedAt: now,
            }),
          },
        ]
      : [],
  );

  const created =
    rows.length > 0
      ? await db
          .insert(itemRefreshSchedules)
          .values(rows)
          .onConflictDoNothing()
          .returning({ contentItemId: itemRefreshSchedules.contentItemId })
      : [];

  const toCollect = planned.flatMap(({ post, collect }) =>
    collect && post.url
      ? [
          {
            sourceId: post.sourceId,
            platform: post.platform,
            externalId: post.externalId,
            url: post.url,
          },
        ]
      : [],
  );

  return {
    schedulesCreated: created.length,
    postsToCollect: toCollect.length,
    commentsDeferredForBudget: deferred.length,
    followUps: planCommentRuns(toCollect),
  };
}
