import { z } from "zod";

/** A highlighted comment embedded in a post scraped by URL; it has no comment id. */
const brightDataFacebookTopCommentSchema = z.object({
  comment: z.string().nullish(),
  user_name: z.string().nullish(),
  date: z.iso.datetime().nullish(),
  likes: z.int().nullish(),
  num_replies: z.int().nullish(),
});

/**
 * One post row from the Bright Data Facebook group/page post datasets and the
 * post-by-URL dataset. Unknown fields are stripped; the full row stays in the
 * R2 archive.
 */
export const brightDataFacebookPostSchema = z.object({
  post_id: z.string().min(1),
  url: z.url(),
  user_username_raw: z.string().nullish(),
  user_url: z.url().nullish(),
  profile_id: z.string().nullish(),
  content: z.string().nullish(),
  date_posted: z.iso.datetime().nullish(),
  num_comments: z.int().nullish(),
  num_shares: z.int().nullish(),
  likes: z.int().nullish(),
  num_reaction_type: z.array(z.unknown()).nullish(),
  /** Post-by-URL dataset name for `num_reaction_type`. */
  num_likes_type: z.array(z.unknown()).nullish(),
  group_name: z.string().nullish(),
  group_id: z.string().nullish(),
  group_url: z.url().nullish(),
  group_category: z.string().nullish(),
  group_members: z.int().nullish(),
  page_name: z.string().nullish(),
  page_followers: z.int().nullish(),
  post_image: z.url().nullish(),
  attachments: z.array(z.unknown()).nullish(),
  video_view_count: z.int().nullish(),
  is_sponsored: z.boolean().nullish(),
  post_type: z.string().nullish(),
  hashtags: z.array(z.string()).nullish(),
  publisher_image_url: z.url().nullish(),
  /** Post-by-URL dataset name for `publisher_image_url`. */
  avatar_image_url: z.url().nullish(),
  /** Post-by-URL dataset only: a few top comments. */
  comments: z.array(brightDataFacebookTopCommentSchema).nullish(),
  delegate_page_id: z.string().nullish(),
});

export type BrightDataFacebookPost = z.infer<typeof brightDataFacebookPostSchema>;

/** One comment row from the Bright Data Facebook comments dataset. */
export const brightDataFacebookCommentSchema = z.object({
  post_id: z.string().min(1),
  post_url: z.url().nullish(),
  url: z.url().nullish(),
  comment_id: z.string().min(1),
  user_name: z.string().nullish(),
  user_id: z.string().nullish(),
  date_created: z.iso.datetime().nullish(),
  comment_text: z.string().nullish(),
  num_likes: z.int().nonnegative().nullish(),
  num_replies: z.int().nonnegative().nullish(),
  comment_link: z.url().nullish(),
  reply: z.boolean().nullish(),
  parent_comment_id: z.string().nullish(),
  commentator_profile_url: z.string().nullish(),
  attached_images: z.array(z.string()).nullish(),
  type: z.string().nullish(),
});

export type BrightDataFacebookComment = z.infer<
  typeof brightDataFacebookCommentSchema
>;
