import { z } from "zod";

import { count, optional } from "../utils/lenient-schema";

// Bright Data drift examples: `group_members` arrives as 518299.99999999994,
// `num_likes_type` is an array in one dataset and an object in another.

/** A highlighted comment embedded in a post scraped by URL; it has no comment id. */
const brightDataFacebookTopCommentSchema = z.object({
  comment: optional(z.string()),
  user_name: optional(z.string()),
  date: optional(z.iso.datetime()),
  likes: count,
  num_replies: count,
});

/**
 * One post row from the Bright Data Facebook group/page post datasets and the
 * post-by-URL dataset. Unknown fields are stripped; the full row stays in the
 * R2 archive.
 */
export const brightDataFacebookPostSchema = z.object({
  post_id: z.string().min(1),
  url: z.url(),
  user_username_raw: optional(z.string()),
  user_url: optional(z.url()),
  profile_id: optional(z.string()),
  content: optional(z.string()),
  date_posted: optional(z.iso.datetime()),
  num_comments: count,
  num_shares: count,
  likes: count,
  num_reaction_type: optional(z.array(z.unknown())),
  /** Post-by-URL dataset name for `num_reaction_type`. */
  num_likes_type: optional(z.array(z.unknown())),
  group_name: optional(z.string()),
  group_id: optional(z.string()),
  group_url: optional(z.url()),
  group_category: optional(z.string()),
  group_members: count,
  page_name: optional(z.string()),
  page_followers: count,
  post_image: optional(z.url()),
  attachments: optional(z.array(z.unknown())),
  video_view_count: count,
  is_sponsored: optional(z.boolean()),
  post_type: optional(z.string()),
  hashtags: optional(z.array(z.string())),
  publisher_image_url: optional(z.url()),
  /** Post-by-URL dataset name for `publisher_image_url`. */
  avatar_image_url: optional(z.url()),
  /** Post-by-URL dataset only: a few top comments. */
  comments: optional(z.array(brightDataFacebookTopCommentSchema)),
  delegate_page_id: optional(z.string()),
});

export type BrightDataFacebookPost = z.infer<typeof brightDataFacebookPostSchema>;

/** One comment row from the Bright Data Facebook comments dataset. */
export const brightDataFacebookCommentSchema = z.object({
  post_id: z.string().min(1),
  post_url: optional(z.url()),
  url: optional(z.url()),
  comment_id: z.string().min(1),
  user_name: optional(z.string()),
  user_id: optional(z.string()),
  date_created: optional(z.iso.datetime()),
  comment_text: optional(z.string()),
  num_likes: count,
  num_replies: count,
  comment_link: optional(z.url()),
  reply: optional(z.boolean()),
  parent_comment_id: optional(z.string()),
  /** Profile link: `/{username}`, `/people/{name}/{id}/` or null. */
  commentator_profile: optional(z.string()),
  /** Avatar image, despite the name. */
  commentator_profile_url: optional(z.string()),
  attached_images: optional(z.array(z.string())),
  type: optional(z.string()),
});

export type BrightDataFacebookComment = z.infer<
  typeof brightDataFacebookCommentSchema
>;
