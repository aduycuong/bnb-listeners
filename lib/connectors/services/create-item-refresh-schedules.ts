import { and, eq } from "drizzle-orm";

import { contentItems, itemRefreshSchedules } from "@/db/schema";
import { db } from "@/lib/db";

import type { FollowUpRun } from "../types";
import { decideCommentCollection } from "../utils/decide-comment-collection";
import { findNextRefreshCheckpoint } from "../utils/find-next-refresh-checkpoint";
import { planCommentRuns } from "../utils/plan-comment-runs";

const HOUR_MS = 60 * 60 * 1000;

type CreateItemRefreshSchedulesParams = {
  /** Posts written by this run (all new, since post runs skip known posts). */
  collectRunId: string;
  now?: Date;
};

type CreateItemRefreshSchedulesResult = {
  schedulesCreated: number;
  postsToCollect: number;
  /** `facebook-comments` runs for posts that pass the rules right away. */
  followUps: FollowUpRun[];
};

/**
 * The post run's `num_comments` is fresh, so new posts are judged right away
 * with the comment-collection rules, then scheduled for their next checkpoint
 * after `published_at`. A post past every checkpoint gets no schedule.
 *
 * Decisions depend only on the stored posts, so a retried step plans the
 * same comment runs; existing schedules are kept.
 */
export async function createItemRefreshSchedules(
  params: CreateItemRefreshSchedulesParams,
): Promise<CreateItemRefreshSchedulesResult> {
  const now = params.now ?? new Date();

  const posts = await db
    .select({
      id: contentItems.id,
      sourceId: contentItems.sourceId,
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

    return { post, collect, next: findNextRefreshCheckpoint({ publishedAt, now }) };
  });

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
    collect && post.url ? [{ sourceId: post.sourceId, url: post.url }] : [],
  );

  return {
    schedulesCreated: created.length,
    postsToCollect: toCollect.length,
    followUps: planCommentRuns(toCollect),
  };
}
