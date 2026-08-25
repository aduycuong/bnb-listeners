import type { BrightDataFacebookPost, FacebookPostMetadata } from "../types";

/**
 * Extracts structured metadata from a parsed Facebook post.
 * Stored in the document's metadata JSONB column for filtering and display;
 * not embedded — use rawContent for semantic search.
 */
export function buildPostMetadata(post: BrightDataFacebookPost): FacebookPostMetadata {
  return {
    postId: post.post_id,
    postUrl: post.url,
    authorName: post.user_username_raw?.trim() ?? null,
    authorId: post.profile_id ?? null,
    authorUrl: post.user_url ?? null,
    groupId: post.group_id ?? null,
    groupName: post.group_name ?? null,
    groupUrl: post.group_url ?? null,
    groupCategory: post.group_category ?? null,
    groupMembers: post.group_members ?? null,
    likes: post.likes,
    numComments: post.num_comments,
    numShares: post.num_shares,
    videoViewCount: post.video_view_count,
    hasImage: !!post.post_image,
    isSponsored: post.is_sponsored,
    isPage: !!post.delegate_page_id,
    price: post.price ?? null,
    location: post.location ?? null,
    hashtags: post.hashtags,
    reactions: post.num_reaction_type ?? null,
  };
}
