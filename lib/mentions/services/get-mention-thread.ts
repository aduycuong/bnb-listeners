import { and, asc, eq, or } from "drizzle-orm";

import { authors, contentItems, itemLabels, mentions } from "@/db/schema";
import { db } from "@/lib/db";

import type { GetMentionThreadResult, ThreadItem } from "../types";

const MAX_THREAD_ITEMS = 400;

/** The root post and all its comments and replies, each with its mention state and label. */
export async function getMentionThread(params: {
  projectId: string;
  rootId: string;
}): Promise<GetMentionThreadResult> {
  const rows = await db
    .select({
      contentItemId: contentItems.id,
      parentId: contentItems.parentId,
      kind: contentItems.kind,
      text: contentItems.text,
      url: contentItems.url,
      publishedAt: contentItems.publishedAt,
      authorName: authors.name,
      mentionId: mentions.id,
      matchType: mentions.matchType,
      matchTier: mentions.matchTier,
      matchedTerms: mentions.matchedTerms,
      matchReason: mentions.matchReason,
      isRelevant: mentions.isRelevant,
      autoIsRelevant: mentions.autoIsRelevant,
      label: itemLabels.isRelevant,
    })
    .from(contentItems)
    .leftJoin(authors, eq(authors.id, contentItems.authorId))
    .leftJoin(
      mentions,
      and(eq(mentions.contentItemId, contentItems.id), eq(mentions.projectId, params.projectId)),
    )
    .leftJoin(
      itemLabels,
      and(
        eq(itemLabels.contentItemId, contentItems.id),
        eq(itemLabels.projectId, params.projectId),
      ),
    )
    .where(or(eq(contentItems.id, params.rootId), eq(contentItems.rootId, params.rootId)))
    .orderBy(asc(contentItems.publishedAt))
    .limit(MAX_THREAD_ITEMS);

  // Root first, then the rest in time order.
  rows.sort((a, b) => Number(b.contentItemId === params.rootId) - Number(a.contentItemId === params.rootId));

  return {
    rootId: params.rootId,
    items: rows.map(
      (row): ThreadItem => ({
        contentItemId: row.contentItemId,
        parentId: row.parentId,
        kind: row.kind,
        text: row.text,
        url: row.url,
        publishedAt: row.publishedAt?.toISOString() ?? null,
        authorName: row.authorName,
        mention: row.mentionId
          ? {
              id: row.mentionId,
              matchType: row.matchType as NonNullable<ThreadItem["mention"]>["matchType"],
              matchTier: row.matchTier as NonNullable<ThreadItem["mention"]>["matchTier"],
              matchedTerms: row.matchedTerms ?? [],
              matchReason: row.matchReason,
              isRelevant: row.isRelevant!,
              autoIsRelevant: row.autoIsRelevant,
            }
          : null,
        label: row.label ?? null,
      }),
    ),
  };
}
