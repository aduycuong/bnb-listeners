import { z } from "zod";

import { count, optional } from "../utils/lenient-schema";

const urlListSchema = z.object({ url_list: optional(z.array(z.string())) });

/**
 * A video as `web/fetch_user_post` returns it (camelCase, `createTime` in
 * seconds). Unknown fields are stripped; the full row stays in the R2 archive.
 */
export const tiktokWebPostSchema = z.object({
  id: z.string().min(1),
  desc: optional(z.string()),
  createTime: optional(z.number()),
  author: optional(
    z.object({
      id: optional(z.string()),
      uniqueId: optional(z.string()),
      nickname: optional(z.string()),
      secUid: optional(z.string()),
      avatarThumb: optional(z.string()),
      verified: optional(z.boolean()),
    }),
  ),
  authorStats: optional(z.object({ followerCount: count })),
  stats: optional(
    z.object({
      playCount: count,
      diggCount: count,
      commentCount: count,
      shareCount: count,
      collectCount: count,
    }),
  ),
  video: optional(z.object({ duration: count })),
  textExtra: optional(z.array(z.object({ hashtagName: optional(z.string()) }))),
  music: optional(
    z.object({
      title: optional(z.string()),
      authorName: optional(z.string()),
      original: optional(z.boolean()),
    }),
  ),
  isAd: optional(z.boolean()),
  textLanguage: optional(z.string()),
});

export type TiktokWebPost = z.infer<typeof tiktokWebPostSchema>;

/**
 * A video as search (`aweme_info`) and `fetch_multi_video` return it
 * (snake_case, `create_time` in seconds).
 */
export const tiktokAwemeSchema = z.object({
  aweme_id: z.string().min(1),
  desc: optional(z.string()),
  create_time: optional(z.number()),
  region: optional(z.string()),
  desc_language: optional(z.string()),
  is_ads: optional(z.boolean()),
  is_top: optional(z.number()),
  author: optional(
    z.object({
      uid: optional(z.string()),
      unique_id: optional(z.string()),
      nickname: optional(z.string()),
      sec_uid: optional(z.string()),
      follower_count: count,
      avatar_thumb: optional(urlListSchema),
    }),
  ),
  statistics: optional(
    z.object({
      play_count: count,
      digg_count: count,
      comment_count: count,
      share_count: count,
      collect_count: count,
    }),
  ),
  video: optional(z.object({ duration: count })),
  text_extra: optional(z.array(z.object({ hashtag_name: optional(z.string()) }))),
  music: optional(
    z.object({
      title: optional(z.string()),
      author: optional(z.string()),
      is_original: optional(z.boolean()),
    }),
  ),
});

export type TiktokAweme = z.infer<typeof tiktokAwemeSchema>;

/**
 * A comment or a reply. A top-level comment has `reply_id = "0"`; a reply
 * carries its top-level comment in `reply_id` and, when it answers another
 * reply, that reply in `reply_to_reply_id` (otherwise `"0"`).
 */
export const tiktokCommentSchema = z.object({
  cid: z.string().min(1),
  aweme_id: optional(z.string()),
  text: optional(z.string()),
  create_time: optional(z.number()),
  digg_count: count,
  /** Replies only exist on top-level comments; absent on replies. */
  reply_comment_total: count,
  reply_id: optional(z.string()),
  reply_to_reply_id: optional(z.string()),
  user: optional(
    z.object({
      uid: optional(z.string()),
      unique_id: optional(z.string()),
      nickname: optional(z.string()),
      sec_uid: optional(z.string()),
      follower_count: count,
      avatar_thumb: optional(urlListSchema),
    }),
  ),
});

export type TiktokComment = z.infer<typeof tiktokCommentSchema>;
