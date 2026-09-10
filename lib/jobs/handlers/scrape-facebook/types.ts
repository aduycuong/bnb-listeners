import { z } from "zod";

/**
 * Schema for a single Facebook post item returned by Bright Data.
 * Uses z.object() (strips unknown fields by default) to be tolerant of
 * extra fields Bright Data may add in the future.
 */
export const brightDataFacebookPostSchema = z.object({
  post_id: z.string(),
  url: z.url(),
  user_username_raw: z.string().nullable().optional(),
  user_url: z.url().nullable().optional(),
  profile_id: z.string().optional(),
  content: z.string(),
  date_posted: z.iso.datetime().nullable().optional(),
  num_comments: z.int().default(0),
  num_shares: z.int().default(0),
  likes: z.int().default(0),
  /** Raw reactions array from Bright Data (structure may vary). */
  num_reaction_type: z.array(z.unknown()).optional(),
  /** Raw reaction-type object from Bright Data (structure may vary). */
  num_likes_type: z.unknown().optional(),
  group_name: z.string().optional(),
  group_id: z.string().optional(),
  group_url: z.url().optional(),
  group_category: z.string().nullable().optional(),
  group_members: z.int().nullable().optional(),
  post_image: z.url().nullable().optional(),
  attachments: z
    .array(z.unknown())
    .nullish()
    .transform((value) => value ?? []),
  video_view_count: z
    .int()
    .nullish()
    .transform((value) => value ?? 0),
  is_sponsored: z.boolean().default(false),
  post_type: z.string().optional(),
  price: z.unknown().nullable().optional(),
  location: z.unknown().nullable().optional(),
  hashtags: z.array(z.string()).default([]),
  publisher_image_url: z.url().nullable().optional(),
  /** Non-null when the post was made by a Page (rather than a personal profile). */
  delegate_page_id: z.string().nullable().optional(),
});

export type BrightDataFacebookPost = z.infer<typeof brightDataFacebookPostSchema>;

/**
 * Input echo returned on each Bright Data Facebook comment row.
 * Matches `.local/sample-brightdata-fb-comments-scrape-result.md`.
 */
export const brightDataFacebookCommentInputSchema = z.object({
  url: z.string(),
  get_all_replies: z.boolean().optional(),
  limit_records: z.int().nonnegative().optional(),
  comments_sort: z.string().optional(),
});

/**
 * Schema for a single Facebook comment item returned by Bright Data
 * dataset gd_lkay758p1eanlolqw8.
 */
export const brightDataFacebookCommentSchema = z.object({
  url: z.url(),
  post_id: z.string(),
  post_url: z.url(),
  comment_id: z.string().min(1),
  user_name: z.string().nullable().optional(),
  user_id: z.string().nullable().optional(),
  date_created: z.iso.datetime().nullable().optional(),
  comment_text: z.string(),
  num_likes: z.int().nonnegative().default(0),
  num_replies: z.int().nonnegative().default(0),
  attached_files: z.array(z.string()).optional(),
  source_type: z.string().nullable().optional(),
  subtype: z.string().nullable().optional(),
  type: z.string().nullable().optional(),
  commentator_profile: z.unknown().nullable().optional(),
  comment_link: z.url().nullable().optional(),
  reply: z.boolean().default(false),
  parent_comment_id: z.string().nullable().optional(),
  commentator_profile_url: z.string().nullable().optional(),
  attached_images: z.array(z.string()).nullable().optional(),
  timestamp: z.iso.datetime().nullable().optional(),
  input: brightDataFacebookCommentInputSchema.optional(),
});

export type BrightDataFacebookComment = z.infer<
  typeof brightDataFacebookCommentSchema
>;

/** Metadata stored alongside a Facebook post document. */
export type FacebookPostMetadata = {
  postId: string;
  postUrl: string;
  authorName: string | null;
  authorId: string | null;
  authorUrl: string | null;
  groupId: string | null;
  groupName: string | null;
  groupUrl: string | null;
  groupCategory: string | null;
  groupMembers: number | null;
  imageUrls: string[];
  videoUrls: string[];
  isSponsored: boolean;
  /** True when posted by a Facebook Page rather than a personal profile. */
  isPage: boolean;
  price: unknown;
  location: unknown;
  hashtags: string[];
  /** Facebook-specific reaction breakdown; the totals live in engagement columns. */
  reactions: unknown;
};

/** Metadata stored alongside a scraped Facebook comment row. */
export type FacebookCommentMetadata = {
  postId: string;
  postUrl: string;
  url: string;
  commentLink: string | null;
  sourceType: string | null;
  subtype: string | null;
  type: string | null;
  reply: boolean;
  parentCommentId: string | null;
  numReplies: number;
  attachedFiles: string[];
  attachedImages: string[];
  commentatorProfile: unknown;
  commentatorProfileUrl: string | null;
  /** Bright Data scrape timestamp for this row. */
  scrapedAt: string | null;
  input: z.infer<typeof brightDataFacebookCommentInputSchema> | null;
};
