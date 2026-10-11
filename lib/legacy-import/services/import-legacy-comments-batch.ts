import { and, asc, eq, gt, ilike, sql } from "drizzle-orm";

import { type Comment, comments, documents } from "@/db/schema";
import { toFacebookCommentExternalId } from "@/lib/connectors/facebook/utils/to-facebook-comment-external-id";
import { db } from "@/lib/db";
import { writeContentItems } from "@/lib/raw-store/services/write-content-items";
import type { NormalizedContentItem } from "@/lib/raw-store/types";

import type {
  ImportLegacyBatchResult,
  ImportLegacyCommentsBatchParams,
} from "../types";
import { filterConnectorCollected } from "../utils/filter-connector-collected";
import { readMetadata } from "../utils/read-metadata";

type LegacyCommentRow = {
  comment: Comment;
  postExternalId: string;
};

function toContentItem(row: LegacyCommentRow): NormalizedContentItem {
  const { comment, postExternalId } = row;
  const meta = comment.metadata;
  const parentCommentId = readMetadata.string(meta, "parentCommentId");
  const isReply = meta.reply === true && !!parentCommentId;
  const scrapedAt = readMetadata.string(meta, "scrapedAt");

  return {
    kind: isReply ? "reply" : "comment",
    externalId: comment.sourceItemId,
    url: readMetadata.string(meta, "commentLink") ?? readMetadata.string(meta, "url"),
    text: comment.content.trim(),
    media: readMetadata.stringArray(meta, "attachedImages")
      .filter((url) => /^https?:\/\//i.test(url))
      .map((url) => ({ type: "image" as const, url })),
    publishedAt: comment.publishedAt,
    likeCount: comment.likeCount,
    commentCount: readMetadata.number(meta, "numReplies") ?? 0,
    shareCount: 0,
    viewCount: 0,
    reactions: null,
    author: comment.authorId
      ? {
          externalId: comment.authorId,
          name: comment.authorName,
          url: `https://www.facebook.com/${comment.authorId}`,
          avatarUrl: readMetadata.string(meta, "commentatorProfileUrl"),
        }
      : null,
    parentExternalId: isReply
      ? toFacebookCommentExternalId(parentCommentId!, postExternalId)
      : postExternalId,
    rootExternalId: postExternalId,
    metadata: {
      legacyCommentId: comment.id,
      postId: postExternalId,
      type: readMetadata.string(meta, "type"),
    },
    collectedAt: scrapedAt ? new Date(scrapedAt) : comment.updatedAt,
  };
}

/**
 * Imports one page of legacy `comments` on Facebook posts. Run the posts
 * import first: comments inherit their source from the parent post.
 */
export async function importLegacyCommentsBatch(
  params: ImportLegacyCommentsBatchParams,
): Promise<ImportLegacyBatchResult> {
  const isReply = sql`coalesce((${comments.metadata} ->> 'reply')::boolean, false)`;

  const rows = await db
    .select({ comment: comments, postExternalId: documents.sourceItemId })
    .from(comments)
    .innerJoin(documents, eq(comments.documentId, documents.id))
    .where(
      and(
        eq(documents.docType, "post"),
        ilike(documents.sourceOriginKey, "%facebook.com%"),
        params.phase === "reply" ? sql`${isReply} = true` : sql`${isReply} = false`,
        params.afterId ? gt(comments.id, params.afterId) : undefined,
      ),
    )
    .orderBy(asc(comments.id))
    .limit(params.limit);

  const mapped = rows.map(toContentItem);
  const items = await filterConnectorCollected(mapped);

  const written = await writeContentItems({
    platform: "facebook",
    origin: "legacy_import",
    items,
    sourceId: null,
    collectRunId: params.collectRunId,
  });

  return {
    nextAfterId: rows.length === params.limit ? rows[rows.length - 1].comment.id : null,
    read: rows.length,
    inserted: written.inserted,
    updated: written.updated,
    skipped: mapped.length - items.length,
  };
}
