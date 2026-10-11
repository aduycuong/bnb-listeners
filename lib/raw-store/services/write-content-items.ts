import { and, eq, inArray, sql } from "drizzle-orm";

import {
  authors,
  contentItems,
  engagementSnapshots,
  type NewContentItem,
} from "@/db/schema";
import { db } from "@/lib/db";

import type {
  NormalizedAuthor,
  NormalizedContentItem,
  WriteContentItemsParams,
  WriteContentItemsResult,
  WrittenContentItem,
} from "../types";
import { computeContentHash } from "../utils/compute-content-hash";

type ItemRef = { id: string; sourceId: string | null };

/**
 * Idempotent upsert of normalized items into `content_items`, with their
 * authors and one engagement snapshot per item per collect run.
 *
 * Items are written in passes so a parent in the same batch is stored before
 * its replies and the reply gets a real `parent_id`. A parent that is still
 * unknown leaves `parent_id` null; its external id stays in
 * `metadata.parentExternalId` so the link can be repaired later.
 */
export async function writeContentItems(
  params: WriteContentItemsParams,
): Promise<WriteContentItemsResult> {
  const items = dedupeByExternalId(params.items);
  if (items.length === 0) {
    return { items: [], inserted: 0, updated: 0 };
  }

  const authorIds = await upsertAuthors(
    params.platform,
    params.origin,
    items.map((item) => item.author).filter((a): a is NormalizedAuthor => !!a),
  );

  const written: WrittenContentItem[] = [];
  let pending = items;

  while (pending.length > 0) {
    const pendingIds = new Set(pending.map((item) => item.externalId));
    let pass = pending.filter(
      (item) => !item.parentExternalId || !pendingIds.has(item.parentExternalId),
    );
    // A parent cycle cannot make progress; write the rest without parents.
    if (pass.length === 0) pass = pending;

    written.push(...(await writePass(params, pass, authorIds)));

    const passIds = new Set(pass.map((item) => item.externalId));
    pending = pending.filter((item) => !passIds.has(item.externalId));
  }

  return {
    items: written,
    inserted: written.filter((item) => item.outcome === "inserted").length,
    updated: written.filter((item) => item.outcome === "updated").length,
  };
}

function dedupeByExternalId(
  items: NormalizedContentItem[],
): NormalizedContentItem[] {
  const byId = new Map<string, NormalizedContentItem>();
  for (const item of items) byId.set(item.externalId, item);
  return [...byId.values()];
}

async function upsertAuthors(
  platform: string,
  origin: string,
  list: NormalizedAuthor[],
): Promise<Map<string, string>> {
  const unique = new Map<string, NormalizedAuthor>();
  for (const author of list) unique.set(author.externalId, author);
  if (unique.size === 0) return new Map();

  const rows = await db
    .insert(authors)
    .values(
      [...unique.values()].map((author) => ({
        platform,
        externalId: author.externalId,
        name: author.name,
        url: author.url,
        avatarUrl: author.avatarUrl ?? null,
        followerCount: author.followerCount ?? null,
        origin,
        metadata: author.metadata ?? {},
      })),
    )
    .onConflictDoUpdate({
      target: [authors.platform, authors.externalId],
      set: {
        name: sql`coalesce(excluded.name, ${authors.name})`,
        url: sql`coalesce(excluded.url, ${authors.url})`,
        avatarUrl: sql`coalesce(excluded.avatar_url, ${authors.avatarUrl})`,
        followerCount: sql`coalesce(excluded.follower_count, ${authors.followerCount})`,
      },
    })
    .returning({ id: authors.id, externalId: authors.externalId });

  return new Map(rows.map((row) => [row.externalId, row.id]));
}

async function findItemRefs(
  platform: string,
  externalIds: string[],
): Promise<Map<string, ItemRef & { commentCount: number }>> {
  if (externalIds.length === 0) return new Map();

  const rows = await db
    .select({
      id: contentItems.id,
      externalId: contentItems.externalId,
      sourceId: contentItems.sourceId,
      commentCount: contentItems.commentCount,
    })
    .from(contentItems)
    .where(
      and(
        eq(contentItems.platform, platform),
        inArray(contentItems.externalId, [...new Set(externalIds)]),
      ),
    );

  return new Map(rows.map((row) => [row.externalId, row]));
}

async function writePass(
  params: WriteContentItemsParams,
  pass: NormalizedContentItem[],
  authorIds: Map<string, string>,
): Promise<WrittenContentItem[]> {
  const collectedAt = params.collectedAt ?? new Date();

  const [existing, threadRefs] = await Promise.all([
    findItemRefs(
      params.platform,
      pass.map((item) => item.externalId),
    ),
    findItemRefs(
      params.platform,
      pass.flatMap((item) =>
        [item.parentExternalId, item.rootExternalId].filter(
          (id): id is string => !!id,
        ),
      ),
    ),
  ]);

  const rows: NewContentItem[] = pass.map((item) => {
    const parent = item.parentExternalId
      ? threadRefs.get(item.parentExternalId)
      : undefined;
    const root = item.rootExternalId
      ? threadRefs.get(item.rootExternalId)
      : undefined;

    return {
      kind: item.kind,
      platform: params.platform,
      sourceId: parent?.sourceId ?? root?.sourceId ?? params.sourceId,
      authorId: item.author ? (authorIds.get(item.author.externalId) ?? null) : null,
      parentId: parent?.id ?? null,
      rootId: root?.id ?? null,
      externalId: item.externalId,
      url: item.url,
      text: item.text,
      media: item.media,
      contentHash: computeContentHash(item.text),
      publishedAt: item.publishedAt,
      firstSeenAt: collectedAt,
      lastCollectedAt: collectedAt,
      likeCount: item.likeCount,
      commentCount: item.commentCount,
      shareCount: item.shareCount,
      viewCount: item.viewCount,
      reactions: item.reactions,
      origin: params.origin,
      collectRunId: params.collectRunId,
      metadata: {
        ...item.metadata,
        ...(item.parentExternalId && { parentExternalId: item.parentExternalId }),
      },
    };
  });

  const upserted = await db
    .insert(contentItems)
    .values(rows)
    .onConflictDoUpdate({
      target: [contentItems.platform, contentItems.externalId],
      set: {
        sourceId: sql`coalesce(${contentItems.sourceId}, excluded.source_id)`,
        authorId: sql`coalesce(excluded.author_id, ${contentItems.authorId})`,
        parentId: sql`coalesce(excluded.parent_id, ${contentItems.parentId})`,
        rootId: sql`coalesce(excluded.root_id, ${contentItems.rootId})`,
        url: sql`coalesce(excluded.url, ${contentItems.url})`,
        text: sql`excluded.text`,
        media: sql`excluded.media`,
        contentHash: sql`excluded.content_hash`,
        publishedAt: sql`coalesce(excluded.published_at, ${contentItems.publishedAt})`,
        lastCollectedAt: sql`greatest(excluded.last_collected_at, ${contentItems.lastCollectedAt})`,
        likeCount: sql`excluded.like_count`,
        commentCount: sql`excluded.comment_count`,
        shareCount: sql`excluded.share_count`,
        viewCount: sql`excluded.view_count`,
        reactions: sql`coalesce(excluded.reactions, ${contentItems.reactions})`,
        collectRunId: sql`coalesce(excluded.collect_run_id, ${contentItems.collectRunId})`,
        metadata: sql`${contentItems.metadata} || excluded.metadata`,
        updatedAt: sql`now()`,
      },
    })
    .returning({
      id: contentItems.id,
      externalId: contentItems.externalId,
    });

  const idByExternalId = new Map(upserted.map((row) => [row.externalId, row.id]));

  await db
    .insert(engagementSnapshots)
    .values(
      pass.map((item) => ({
        contentItemId: idByExternalId.get(item.externalId)!,
        collectRunId: params.collectRunId,
        capturedAt: collectedAt,
        likeCount: item.likeCount,
        commentCount: item.commentCount,
        shareCount: item.shareCount,
        viewCount: item.viewCount,
        reactions: item.reactions,
      })),
    )
    .onConflictDoNothing();

  return pass.map((item) => {
    const before = existing.get(item.externalId);
    return {
      id: idByExternalId.get(item.externalId)!,
      externalId: item.externalId,
      kind: item.kind,
      outcome: before ? "updated" : "inserted",
      commentCount: item.commentCount,
      previousCommentCount: before?.commentCount ?? null,
      url: item.url,
    };
  });
}
