import { authors, contentItems, sources } from "@/db/schema";

import type { AdminContentItemRow } from "../types";
import { toIso } from "./to-iso";
import { truncateText } from "./truncate-text";

/** Columns for an `AdminContentItemRow`; join `sources` and `authors` (left). */
export const contentItemRowColumns = {
  id: contentItems.id,
  kind: contentItems.kind,
  platform: contentItems.platform,
  sourceId: sources.id,
  sourceName: sources.name,
  authorName: authors.name,
  text: contentItems.text,
  url: contentItems.url,
  publishedAt: contentItems.publishedAt,
  firstSeenAt: contentItems.firstSeenAt,
  likeCount: contentItems.likeCount,
  commentCount: contentItems.commentCount,
  shareCount: contentItems.shareCount,
  origin: contentItems.origin,
  rootId: contentItems.rootId,
};

type ContentItemRowRecord = {
  id: string;
  kind: string;
  platform: string;
  sourceId: string | null;
  sourceName: string | null;
  authorName: string | null;
  text: string;
  url: string | null;
  publishedAt: Date | null;
  firstSeenAt: Date;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  origin: string;
  rootId: string | null;
};

export function toContentItemRow(
  row: ContentItemRowRecord,
  options: { fullText?: boolean } = {},
): AdminContentItemRow {
  return {
    id: row.id,
    kind: row.kind,
    platform: row.platform,
    source: row.sourceId ? { id: row.sourceId, name: row.sourceName } : null,
    authorName: row.authorName,
    text: options.fullText ? row.text : truncateText(row.text),
    url: row.url,
    publishedAt: toIso(row.publishedAt),
    firstSeenAt: row.firstSeenAt.toISOString(),
    likeCount: row.likeCount,
    commentCount: row.commentCount,
    shareCount: row.shareCount,
    origin: row.origin,
    rootId: row.rootId,
  };
}
