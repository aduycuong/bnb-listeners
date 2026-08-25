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
  attachments: z.array(z.unknown()).default([]),
  video_view_count: z.int().default(0),
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
  likes: number;
  numComments: number;
  numShares: number;
  videoViewCount: number;
  hasImage: boolean;
  isSponsored: boolean;
  /** True when posted by a Facebook Page rather than a personal profile. */
  isPage: boolean;
  price: unknown;
  location: unknown;
  hashtags: string[];
  reactions: unknown;
};
