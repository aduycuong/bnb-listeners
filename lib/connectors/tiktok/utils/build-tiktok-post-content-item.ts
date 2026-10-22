import type { NormalizedAuthor, NormalizedContentItem } from "@/lib/raw-store/types";

import { buildTiktokVideoUrl } from "./build-tiktok-video-url";

type TiktokPostFields = {
  videoId: string;
  uniqueId: string | null;
  text: string | null;
  publishedAt: Date | null;
  likeCount: number | null;
  commentCount: number | null;
  shareCount: number | null;
  viewCount: number | null;
  collectCount: number | null;
  author: NormalizedAuthor | null;
  hashtags: (string | null | undefined)[];
  durationSeconds: number | null;
  music: { title: string | null; author: string | null; original: boolean | null } | null;
  region: string | null;
  language: string | null;
  isAd: boolean | null;
  isPinned: boolean;
};

/**
 * The platform-neutral item both TikTok video shapes map to. TikTok videos are
 * `post`s so the schedules and counters that read posts treat them like any
 * other. Media is not stored: TikTok CDN links are signed and expire.
 */
export function buildTiktokPostContentItem(
  fields: TiktokPostFields,
): NormalizedContentItem {
  const hashtags = [
    ...new Set(
      fields.hashtags.flatMap((tag) => (tag?.trim() ? [tag.trim()] : [])),
    ),
  ];

  return {
    kind: "post",
    externalId: fields.videoId,
    url: buildTiktokVideoUrl(fields.uniqueId, fields.videoId),
    text: fields.text?.trim() ?? "",
    media: [],
    publishedAt: fields.publishedAt,
    likeCount: fields.likeCount ?? 0,
    commentCount: fields.commentCount ?? 0,
    shareCount: fields.shareCount ?? 0,
    viewCount: fields.viewCount ?? 0,
    reactions: null,
    author: fields.author,
    parentExternalId: null,
    rootExternalId: null,
    metadata: {
      postType: "video",
      hashtags,
      durationSeconds: fields.durationSeconds,
      music: fields.music,
      region: fields.region,
      language: fields.language,
      isAd: fields.isAd ?? false,
      isPinned: fields.isPinned,
      collectCount: fields.collectCount ?? 0,
    },
  };
}
