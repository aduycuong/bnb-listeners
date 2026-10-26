import { eq, inArray } from "drizzle-orm";

import { contentItems, itemRefreshSchedules } from "@/db/schema";
import { db } from "@/lib/db";

import { COLLECT_CONFIG } from "../config";
import type { FollowUpRun } from "../types";
import {
  type CommentCollectionReason,
  decideCommentCollection,
} from "../utils/decide-comment-collection";
import { findNextRefreshCheckpoint } from "../utils/find-next-refresh-checkpoint";
import { fitCommentBudget } from "../utils/fit-comment-budget";
import { planCommentRuns } from "../utils/plan-comment-runs";
import { getCollectSettings } from "./get-collect-settings";
import { getSourceBudgets } from "./get-source-budgets";

const HOUR_MS = 60 * 60 * 1000;

type ProcessRefreshCheckpointsParams = {
  /** Posts whose `comment_count` was just refreshed. */
  contentItemIds: string[];
  now?: Date;
  /** Decide only; no schedule writes. */
  dryRun?: boolean;
};

export type RefreshDecision = {
  contentItemId: string;
  sourceId: string | null;
  platform: string;
  externalId: string;
  url: string | null;
  checkpointHours: number;
  numComments: number;
  collectedCount: number | null;
  /** Why comments are collected; null = skipped. */
  collect: CommentCollectionReason;
  /** Passed the rules but did not fit the source's budget; judged again at the next checkpoint. */
  deferredForBudget: boolean;
  /** Next checkpoint; null = schedule removed. */
  nextCheckpointHours: number | null;
};

type PlannedDecision = {
  decision: RefreshDecision;
  nextDueAt: Date | null;
};

type ProcessRefreshCheckpointsResult = {
  decisions: RefreshDecision[];
  /** Comment runs of the platform's connector, grouped by source. */
  followUps: FollowUpRun[];
};

/**
 * Applies the comment-collection rules to posts at their checkpoint, using
 * the stored `comment_count`, then moves each schedule to its next checkpoint
 * or removes it. Collections that do not fit the source's remaining monthly
 * and daily budget are deferred (`fitCommentBudget`). Returns the comment
 * runs to start.
 */
export async function processRefreshCheckpoints(
  params: ProcessRefreshCheckpointsParams,
): Promise<ProcessRefreshCheckpointsResult> {
  const now = params.now ?? new Date();
  if (params.contentItemIds.length === 0) return { decisions: [], followUps: [] };
  const { checkpointsHours } = (await getCollectSettings()).commentRefresh;

  const rows = await db
    .select({
      contentItemId: itemRefreshSchedules.contentItemId,
      checkpointHours: itemRefreshSchedules.checkpointHours,
      collectedCount: itemRefreshSchedules.commentsCollectedCount,
      sourceId: contentItems.sourceId,
      platform: contentItems.platform,
      externalId: contentItems.externalId,
      url: contentItems.url,
      numComments: contentItems.commentCount,
      publishedAt: contentItems.publishedAt,
      firstSeenAt: contentItems.firstSeenAt,
    })
    .from(itemRefreshSchedules)
    .innerJoin(contentItems, eq(contentItems.id, itemRefreshSchedules.contentItemId))
    .where(inArray(itemRefreshSchedules.contentItemId, params.contentItemIds));

  const planned = rows.map((row): PlannedDecision => {
    const publishedAt = row.publishedAt ?? row.firstSeenAt;
    const next = findNextRefreshCheckpoint({ publishedAt, now, checkpointsHours });

    const decision: RefreshDecision = {
      contentItemId: row.contentItemId,
      sourceId: row.sourceId,
      platform: row.platform,
      externalId: row.externalId,
      url: row.url,
      checkpointHours: row.checkpointHours,
      numComments: row.numComments,
      collectedCount: row.collectedCount,
      collect: row.url
        ? decideCommentCollection({
            numComments: row.numComments,
            collectedCount: row.collectedCount,
            ageHours: (now.getTime() - publishedAt.getTime()) / HOUR_MS,
          })
        : null,
      nextCheckpointHours: next?.checkpointHours ?? null,
      deferredForBudget: false,
    };
    return { decision, nextDueAt: next?.dueAt ?? null };
  });

  await deferOverBudget(planned.map((item) => item.decision), now);

  if (!params.dryRun) {
    await saveDecisions(planned, now);
  }

  const decisions = planned.map((item) => item.decision);
  return {
    decisions,
    followUps: planCommentRuns(
      decisions.flatMap((decision) =>
        decision.collect && decision.url
          ? [
              {
                sourceId: decision.sourceId,
                platform: decision.platform,
                externalId: decision.externalId,
                url: decision.url,
              },
            ]
          : [],
      ),
    ),
  };
}

async function deferOverBudget(decisions: RefreshDecision[], now: Date): Promise<void> {
  const candidates = decisions.filter((decision) => decision.collect && decision.url);
  const sourceIds = [
    ...new Set(candidates.flatMap((decision) => (decision.sourceId ? [decision.sourceId] : []))),
  ];
  if (sourceIds.length === 0) return;

  const budgets = await getSourceBudgets({ sourceIds, now });
  const { deferred } = fitCommentBudget(
    candidates,
    new Map(budgets.map((budget) => [budget.sourceId, budget.remaining])),
    COLLECT_CONFIG.commentRefresh.maxRowsPerPost,
  );
  for (const decision of deferred) {
    decision.collect = null;
    decision.deferredForBudget = true;
  }
}

async function saveDecisions(planned: PlannedDecision[], now: Date): Promise<void> {
  const finished = planned
    .filter((item) => item.nextDueAt === null)
    .map((item) => item.decision.contentItemId);

  if (finished.length > 0) {
    await db
      .delete(itemRefreshSchedules)
      .where(inArray(itemRefreshSchedules.contentItemId, finished));
  }

  for (const { decision, nextDueAt } of planned) {
    if (nextDueAt === null) continue;

    await db
      .update(itemRefreshSchedules)
      .set({
        checkpointHours: decision.nextCheckpointHours!,
        nextRefreshAt: nextDueAt,
        ...(decision.collect && {
          commentsCollectedCount: decision.numComments,
          commentsCollectedAt: now,
        }),
      })
      .where(eq(itemRefreshSchedules.contentItemId, decision.contentItemId));
  }
}
