import type { NormalizedContentItem } from "@/lib/raw-store/types";

import type { TiktokAweme } from "../schema";
import { buildTiktokPostContentItem } from "./build-tiktok-post-content-item";
import { buildTiktokProfileUrl } from "./build-tiktok-video-url";
import { fromUnixSeconds } from "./from-unix-seconds";

/** Maps a video from search results or `fetch_multi_video` (a refresh). */
export function toTiktokAwemeContentItem(
  post: TiktokAweme,
): NormalizedContentItem {
  const author = post.author;
  const authorExternalId = author?.uid?.trim() || null;
  const uniqueId = author?.unique_id?.trim() || null;

  return buildTiktokPostContentItem({
    videoId: post.aweme_id,
    uniqueId,
    text: post.desc ?? null,
    publishedAt: fromUnixSeconds(post.create_time),
    likeCount: post.statistics?.digg_count ?? null,
    commentCount: post.statistics?.comment_count ?? null,
    shareCount: post.statistics?.share_count ?? null,
    viewCount: post.statistics?.play_count ?? null,
    collectCount: post.statistics?.collect_count ?? null,
    author: authorExternalId
      ? {
          externalId: authorExternalId,
          name: author?.nickname?.trim() || null,
          url: uniqueId ? buildTiktokProfileUrl(uniqueId) : null,
          avatarUrl: author?.avatar_thumb?.url_list?.[0] ?? null,
          followerCount: author?.follower_count ?? null,
          metadata: { uniqueId, secUid: author?.sec_uid ?? null },
        }
      : null,
    hashtags: (post.text_extra ?? []).map((extra) => extra.hashtag_name),
    durationSeconds: post.video?.duration ?? null,
    music: post.music
      ? {
          title: post.music.title ?? null,
          author: post.music.author ?? null,
          original: post.music.is_original ?? null,
        }
      : null,
    region: post.region ?? null,
    language: post.desc_language ?? null,
    isAd: post.is_ads ?? null,
    isPinned: post.is_top === 1,
  });
}
