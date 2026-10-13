import { asc, count, desc, eq, or } from "drizzle-orm";

import {
  authors,
  contentItems,
  engagementSnapshots,
  itemRefreshSchedules,
  sources,
} from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";

import type { AdminContentItemDetail } from "../types";
import { contentItemRowColumns, toContentItemRow } from "../utils/content-item-row";
import { toIso } from "../utils/to-iso";

/** Thread rows returned with an item; larger threads are cut. */
const THREAD_LIMIT = 500;

type GetAdminContentItemParams = {
  id: string;
};

/** One item with its author, thread (comments and replies), engagement history and refresh checkpoint. */
export async function getAdminContentItem(
  params: GetAdminContentItemParams,
): Promise<AdminContentItemDetail> {
  const [row] = await db
    .select({
      ...contentItemRowColumns,
      externalId: contentItems.externalId,
      parentId: contentItems.parentId,
      language: contentItems.language,
      viewCount: contentItems.viewCount,
      reactions: contentItems.reactions,
      media: contentItems.media,
      contentHash: contentItems.contentHash,
      lastCollectedAt: contentItems.lastCollectedAt,
      collectRunId: contentItems.collectRunId,
      metadata: contentItems.metadata,
      authorId: authors.id,
      authorUrl: authors.url,
      authorExternalId: authors.externalId,
    })
    .from(contentItems)
    .leftJoin(sources, eq(sources.id, contentItems.sourceId))
    .leftJoin(authors, eq(authors.id, contentItems.authorId))
    .where(eq(contentItems.id, params.id))
    .limit(1);

  if (!row) {
    throw new NotFoundError("content item", params.id);
  }

  const threadWhere = or(eq(contentItems.rootId, row.id), eq(contentItems.parentId, row.id));

  const [thread, [threadTotal], snapshots, [refreshSchedule]] = await Promise.all([
    db
      .select(contentItemRowColumns)
      .from(contentItems)
      .leftJoin(sources, eq(sources.id, contentItems.sourceId))
      .leftJoin(authors, eq(authors.id, contentItems.authorId))
      .where(threadWhere)
      .orderBy(asc(contentItems.publishedAt), asc(contentItems.id))
      .limit(THREAD_LIMIT),
    db.select({ value: count() }).from(contentItems).where(threadWhere),
    db
      .select()
      .from(engagementSnapshots)
      .where(eq(engagementSnapshots.contentItemId, row.id))
      .orderBy(desc(engagementSnapshots.capturedAt)),
    db
      .select()
      .from(itemRefreshSchedules)
      .where(eq(itemRefreshSchedules.contentItemId, row.id))
      .limit(1),
  ]);

  return {
    item: {
      ...toContentItemRow(row, { fullText: true }),
      externalId: row.externalId,
      parentId: row.parentId,
      language: row.language,
      viewCount: row.viewCount,
      reactions: row.reactions,
      media: row.media,
      contentHash: row.contentHash,
      lastCollectedAt: row.lastCollectedAt.toISOString(),
      collectRunId: row.collectRunId,
      metadata: row.metadata,
      author: row.authorId
        ? {
            id: row.authorId,
            name: row.authorName,
            url: row.authorUrl,
            externalId: row.authorExternalId!,
          }
        : null,
    },
    thread: thread.map((item) => toContentItemRow(item, { fullText: true })),
    threadTotal: threadTotal?.value ?? 0,
    snapshots: snapshots.map((snapshot) => ({
      capturedAt: snapshot.capturedAt.toISOString(),
      collectRunId: snapshot.collectRunId,
      likeCount: snapshot.likeCount,
      commentCount: snapshot.commentCount,
      shareCount: snapshot.shareCount,
      viewCount: snapshot.viewCount,
    })),
    refreshSchedule: refreshSchedule
      ? {
          nextRefreshAt: refreshSchedule.nextRefreshAt.toISOString(),
          checkpointHours: refreshSchedule.checkpointHours,
          commentsCollectedCount: refreshSchedule.commentsCollectedCount,
          commentsCollectedAt: toIso(refreshSchedule.commentsCollectedAt),
        }
      : null,
  };
}
