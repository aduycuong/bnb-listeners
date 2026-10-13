import { and, asc, count, eq, gt, lte } from "drizzle-orm";

import { contentItems, itemRefreshSchedules, sources } from "@/db/schema";
import { db } from "@/lib/db";

import type {
  AdminRefreshScheduleRow,
  ListAdminRefreshSchedulesParams,
  PageResult,
} from "../types";
import { resolvePage } from "../utils/resolve-page";
import { toIso } from "../utils/to-iso";
import { truncateText } from "../utils/truncate-text";

/** Comment-refresh checkpoints, soonest first, with their posts. */
export async function listAdminRefreshSchedules(
  params: ListAdminRefreshSchedulesParams,
): Promise<PageResult<AdminRefreshScheduleRow>> {
  const { page, pageSize, offset } = resolvePage(params);
  const now = new Date();

  const where = and(
    params.sourceId ? eq(contentItems.sourceId, params.sourceId) : undefined,
    params.due === "overdue" ? lte(itemRefreshSchedules.nextRefreshAt, now) : undefined,
    params.due === "upcoming" ? gt(itemRefreshSchedules.nextRefreshAt, now) : undefined,
  );

  const [rows, [total]] = await Promise.all([
    db
      .select({
        contentItemId: itemRefreshSchedules.contentItemId,
        sourceId: sources.id,
        sourceName: sources.name,
        text: contentItems.text,
        url: contentItems.url,
        publishedAt: contentItems.publishedAt,
        commentCount: contentItems.commentCount,
        nextRefreshAt: itemRefreshSchedules.nextRefreshAt,
        checkpointHours: itemRefreshSchedules.checkpointHours,
        commentsCollectedCount: itemRefreshSchedules.commentsCollectedCount,
        commentsCollectedAt: itemRefreshSchedules.commentsCollectedAt,
      })
      .from(itemRefreshSchedules)
      .innerJoin(contentItems, eq(contentItems.id, itemRefreshSchedules.contentItemId))
      .leftJoin(sources, eq(sources.id, contentItems.sourceId))
      .where(where)
      .orderBy(asc(itemRefreshSchedules.nextRefreshAt))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ value: count() })
      .from(itemRefreshSchedules)
      .innerJoin(contentItems, eq(contentItems.id, itemRefreshSchedules.contentItemId))
      .where(where),
  ]);

  return {
    items: rows.map((row) => ({
      contentItemId: row.contentItemId,
      source: row.sourceId ? { id: row.sourceId, name: row.sourceName } : null,
      text: truncateText(row.text),
      url: row.url,
      publishedAt: toIso(row.publishedAt),
      commentCount: row.commentCount,
      nextRefreshAt: row.nextRefreshAt.toISOString(),
      overdue: row.nextRefreshAt <= now,
      checkpointHours: row.checkpointHours,
      commentsCollectedCount: row.commentsCollectedCount,
      commentsCollectedAt: toIso(row.commentsCollectedAt),
    })),
    total: total?.value ?? 0,
    page,
    pageSize,
  };
}
