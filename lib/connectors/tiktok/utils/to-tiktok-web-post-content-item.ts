import type { NormalizedContentItem } from "@/lib/raw-store/types";

import type { TiktokWebPost } from "../schema";
import { buildTiktokPostContentItem } from "./build-tiktok-post-content-item";
import { buildTiktokProfileUrl } from "./build-tiktok-video-url";
import { fromUnixSeconds } from "./from-unix-seconds";

/** Maps a video from `web/fetch_user_post` (a channel scan). */
export function toTiktokWebPostContentItem(
  post: TiktokWebPost,
): NormalizedContentItem {
  const author = post.author;
  const authorExternalId = author?.id?.trim() || null;
  const uniqueId = author?.uniqueId?.trim() || null;

  return buildTiktokPostContentItem({
    videoId: post.id,
    uniqueId,
    text: post.desc ?? null,
    publishedAt: fromUnixSeconds(post.createTime),
    likeCount: post.stats?.diggCount ?? null,
    commentCount: post.stats?.commentCount ?? null,
    shareCount: post.stats?.shareCount ?? null,
    viewCount: post.stats?.playCount ?? null,
    collectCount: post.stats?.collectCount ?? null,
    author: authorExternalId
      ? {
          externalId: authorExternalId,
          name: author?.nickname?.trim() || null,
          url: uniqueId ? buildTiktokProfileUrl(uniqueId) : null,
          avatarUrl: author?.avatarThumb ?? null,
          followerCount: post.authorStats?.followerCount ?? null,
          metadata: {
            uniqueId,
            secUid: author?.secUid ?? null,
            verified: author?.verified ?? false,
          },
        }
      : null,
    hashtags: (post.textExtra ?? []).map((extra) => extra.hashtagName),
    durationSeconds: post.video?.duration ?? null,
    music: post.music
      ? {
          title: post.music.title ?? null,
          author: post.music.authorName ?? null,
          original: post.music.original ?? null,
        }
      : null,
    region: null,
    language: post.textLanguage ?? null,
    isAd: post.isAd ?? null,
    isPinned: false,
  });
}
