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
  /** Synthetic authors only: the persona the author was created from. */
  personaId?: string | null;
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
  /** Overrides the batch `collectedAt`, e.g. the original time of a legacy row. */
  collectedAt?: Date;
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
  /** `skip` leaves rows that already exist untouched (no update, no snapshot). Defaults to `update`. */
  onExisting?: "update" | "skip";
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
  /** Existing rows left untouched because of `onExisting: "skip"`. */
  skippedExisting: number;
};

export type DeleteSourceContentItemsParams = {
  sourceId: string;
  /** Only delete items of this origin; all origins when omitted. */
  origin?: RawOrigin;
  /** Count only; nothing is deleted. */
  dryRun?: boolean;
};

export type DeleteSourceContentItemsResult = {
  sourceName: string | null;
  groups: { kind: string; origin: string; count: number }[];
  total: number;
  deleted: number;
};

export type DeleteContentItemsParams = {
  ids: string[];
};

export type DeleteContentItemsResult = {
  /** Distinct ids the caller asked to delete. */
  requested: number;
  /** How many of those ids still existed. */
  requestedFound: number;
  /** Rows removed, including comments and replies under the requested ids. */
  deleted: number;
  /** Removed rows the caller did not list: the thread under the selection. */
  descendants: number;
};

export type GetSourceLatestPublishedAtParams = {
  sourceId: string;
  kind?: ContentItemKind;
};

export type CountSourceItemsInRangeParams = {
  sourceId: string;
  kind?: ContentItemKind;
  from: Date;
  to: Date;
};
