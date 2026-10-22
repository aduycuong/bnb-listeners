import type { NormalizedContentItem } from "@/lib/raw-store/types";

import type { TiktokComment } from "../schema";
import { buildTiktokProfileUrl } from "./build-tiktok-video-url";
import { fromUnixSeconds } from "./from-unix-seconds";

type ToTiktokCommentContentItemParams = {
  comment: TiktokComment;
  videoId: string;
  /** The video's stored URL; comment links are built on it. */
  videoUrl?: string | null;
};

/** TikTok writes "no value" as the string "0" in the reply id fields. */
function readId(value: string | null | undefined): string | null {
  const id = value?.trim();
  return id && id !== "0" ? id : null;
}

/**
 * Maps a comment or reply. A reply's parent is the reply it answers
 * (`reply_to_reply_id`) or else its top-level comment (`reply_id`), like
 * Facebook's nested replies (D9). Comments are ids unique across TikTok, so no
 * video prefix is needed. Sticker-only comments have no text and are dropped.
 */
export function toTiktokCommentContentItem(
  params: ToTiktokCommentContentItemParams,
): NormalizedContentItem | null {
  const { comment, videoId } = params;
  const text = comment.text?.trim() ?? "";
  if (!text) return null;

  const topLevelId = readId(comment.reply_id);
  const answeredReplyId = readId(comment.reply_to_reply_id);
  const isReply = topLevelId !== null;

  const user = comment.user;
  const authorExternalId = user?.uid?.trim() || null;
  const uniqueId = user?.unique_id?.trim() || null;

  return {
    kind: isReply ? "reply" : "comment",
    externalId: comment.cid,
    url: params.videoUrl
      ? `${params.videoUrl}?comment_id=${comment.cid}`
      : null,
    text,
    media: [],
    publishedAt: fromUnixSeconds(comment.create_time),
    likeCount: comment.digg_count ?? 0,
    commentCount: comment.reply_comment_total ?? 0,
    shareCount: 0,
    viewCount: 0,
    reactions: null,
    author: authorExternalId
      ? {
          externalId: authorExternalId,
          name: user?.nickname?.trim() || null,
          url: uniqueId ? buildTiktokProfileUrl(uniqueId) : null,
          avatarUrl: user?.avatar_thumb?.url_list?.[0] ?? null,
          followerCount: user?.follower_count ?? null,
          metadata: { uniqueId, secUid: user?.sec_uid ?? null },
        }
      : null,
    parentExternalId: isReply ? (answeredReplyId ?? topLevelId) : videoId,
    rootExternalId: videoId,
    metadata: { videoId },
  };
}
