import type { NormalizedContentItem } from "@/lib/raw-store/types";

import type { BrightDataFacebookPost } from "../schema";
import { extractFacebookPostMedia } from "./extract-facebook-post-media";
import { parseFacebookReactions } from "./parse-facebook-reactions";

/** Maps a post row from either the group/page datasets or the post-by-URL dataset. */
export function toFacebookPostContentItem(
  post: BrightDataFacebookPost,
): NormalizedContentItem {
  const authorExternalId = post.profile_id?.trim() || post.user_url?.trim() || null;

  return {
    kind: "post",
    externalId: post.post_id,
    url: post.url,
    text: post.content?.trim() ?? "",
    media: extractFacebookPostMedia(post),
    publishedAt: post.date_posted ? new Date(post.date_posted) : null,
    likeCount: post.likes ?? 0,
    commentCount: post.num_comments ?? 0,
    shareCount: post.num_shares ?? 0,
    viewCount: post.video_view_count ?? 0,
    reactions: parseFacebookReactions(post.num_reaction_type ?? post.num_likes_type),
    author: authorExternalId
      ? {
          externalId: authorExternalId,
          name: post.user_username_raw?.trim() || null,
          url: post.user_url ?? null,
          avatarUrl: post.publisher_image_url ?? post.avatar_image_url ?? null,
          metadata: { isPage: !!post.delegate_page_id },
        }
      : null,
    parentExternalId: null,
    rootExternalId: null,
    metadata: {
      postType: post.post_type ?? null,
      isSponsored: post.is_sponsored ?? false,
      hashtags: post.hashtags ?? [],
      // Preview only: these comments have no id, so they are not stored as items.
      ...(post.comments && {
        topComments: post.comments.map((comment) => ({
          text: comment.comment ?? "",
          userName: comment.user_name ?? null,
          date: comment.date ?? null,
          likes: comment.likes ?? 0,
          numReplies: comment.num_replies ?? 0,
        })),
      }),
    },
  };
}
