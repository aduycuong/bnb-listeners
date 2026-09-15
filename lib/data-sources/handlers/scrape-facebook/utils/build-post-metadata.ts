import type { BrightDataFacebookPost, FacebookPostMetadata } from "../types";
import { extractPostMediaUrls } from "./extract-post-media-urls";

/**
 * Extracts structured metadata from a parsed Facebook post.
 * Stored in the document's metadata JSONB column for filtering and display.
 *
 * Engagement totals are deliberately absent — they live in real columns so they
 * can be filtered and sorted on. Media URLs are kept here because chunking
 * needs them to build image and video chunks.
 */
export function buildPostMetadata(
  post: BrightDataFacebookPost,
): FacebookPostMetadata {
  const { imageUrls, videoUrls } = extractPostMediaUrls(post);

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
    imageUrls,
    videoUrls,
    isSponsored: post.is_sponsored,
    isPage: !!post.delegate_page_id,
    price: post.price ?? null,
    location: post.location ?? null,
    hashtags: post.hashtags,
    reactions: post.num_reaction_type ?? null,
  };
}
