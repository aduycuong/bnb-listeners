import type { ContentItemMedia } from "@/db/schema";

export const RAW_ORIGINS = ["connector", "synthetic", "legacy_import"] as const;
export type RawOrigin = (typeof RAW_ORIGINS)[number];

export const CONTENT_ITEM_KINDS = [
  "post",
  "comment",
  "reply",
  "article",
  "video",
  "listing",
] as const;
export type ContentItemKind = (typeof CONTENT_ITEM_KINDS)[number];

export type NormalizedAuthor = {
  externalId: string;
  name: string | null;
  url: string | null;
  avatarUrl?: string | null;
  followerCount?: number | null;
  metadata?: Record<string, unknown>;
};

/**
 * A content item in platform-neutral shape. Thread links use external ids;
 * the writer resolves them to `content_items.id`.
 */
export type NormalizedContentItem = {
  kind: ContentItemKind;
  externalId: string;
  url: string | null;
  text: string;
  media: ContentItemMedia[];
  publishedAt: Date | null;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  viewCount: number;
  reactions: Record<string, number> | null;
  author: NormalizedAuthor | null;
  parentExternalId: string | null;
  rootExternalId: string | null;
  metadata: Record<string, unknown>;
};

export type RegisterSourceParams = {
  platform: string;
  sourceType: string;
  externalId: string;
  url?: string | null;
  name?: string | null;
  origin?: RawOrigin;
  metadata?: Record<string, unknown>;
};

export type RegisterSourceResult = {
  sourceId: string;
  created: boolean;
};

export type UpdateSourceDetailsParams = {
  sourceId: string;
  name?: string | null;
  followerCount?: number | null;
  memberCount?: number | null;
  /** Merged into the existing metadata. */
  metadata?: Record<string, unknown>;
  lastCollectedAt?: Date;
};

export type WriteContentItemsParams = {
  platform: string;
  origin: RawOrigin;
  items: NormalizedContentItem[];
  /** Used when an item has no parent to inherit a source from. */
  sourceId: string | null;
  collectRunId: string | null;
  /** Defaults to now; legacy imports pass the original collection time. */
  collectedAt?: Date;
};

export type WrittenContentItem = {
  id: string;
  externalId: string;
  kind: ContentItemKind;
  outcome: "inserted" | "updated";
  commentCount: number;
  /** Comment count before this write; null for inserted rows. */
  previousCommentCount: number | null;
  url: string | null;
};

export type WriteContentItemsResult = {
  items: WrittenContentItem[];
  inserted: number;
  updated: number;
};

export type GetSourceLatestPublishedAtParams = {
  sourceId: string;
  kind?: ContentItemKind;
};
