import { and, eq } from "drizzle-orm";

import { contentItems, itemRefreshSchedules } from "@/db/schema";
import { db } from "@/lib/db";

import { COLLECT_CONFIG } from "../config";
import { findNextRefreshCheckpoint } from "../utils/find-next-refresh-checkpoint";

type CreateItemRefreshSchedulesParams = {
  /** Posts written by this run get a schedule. */
  collectRunId: string;
  now?: Date;
};

type CreateItemRefreshSchedulesResult = {
  schedulesCreated: number;
};

/**
 * Schedules the first comment-refresh checkpoint of each post written by a
 * run. A post already past every checkpoint is due right away, for one check.
 * Existing schedules are kept, so a retried step changes nothing.
 */
export async function createItemRefreshSchedules(
  params: CreateItemRefreshSchedulesParams,
): Promise<CreateItemRefreshSchedulesResult> {
  const now = params.now ?? new Date();
  const checkpoints = COLLECT_CONFIG.commentRefresh.checkpointsHours;

  const posts = await db
    .select({
      id: contentItems.id,
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

  if (posts.length === 0) return { schedulesCreated: 0 };

  const rows = posts.map((post) => {
    const next = findNextRefreshCheckpoint({
      publishedAt: post.publishedAt ?? post.firstSeenAt,
      now,
    });

    return {
      contentItemId: post.id,
      checkpointHours: next?.checkpointHours ?? checkpoints[checkpoints.length - 1],
      nextRefreshAt: next?.dueAt ?? now,
    };
  });

  const created = await db
    .insert(itemRefreshSchedules)
    .values(rows)
    .onConflictDoNothing()
    .returning({ contentItemId: itemRefreshSchedules.contentItemId });

  return { schedulesCreated: created.length };
}
