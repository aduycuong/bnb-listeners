import type {
  BrightDataFacebookComment,
  FacebookCommentMetadata,
} from "../types";

/**
 * Extracts structured metadata from a parsed Bright Data Facebook comment.
 * Stored on the comment row for filtering, display, and future chunking.
 */
export function buildCommentMetadata(
  comment: BrightDataFacebookComment,
): FacebookCommentMetadata {
  return {
    postId: comment.post_id,
    postUrl: comment.post_url,
    url: comment.url,
    commentLink: comment.comment_link ?? null,
    sourceType: comment.source_type ?? null,
    subtype: comment.subtype ?? null,
    type: comment.type ?? null,
    reply: comment.reply,
    parentCommentId: comment.parent_comment_id ?? null,
    numReplies: comment.num_replies,
    attachedFiles: comment.attached_files ?? [],
    attachedImages: comment.attached_images ?? [],
    commentatorProfile: comment.commentator_profile ?? null,
    commentatorProfileUrl: comment.commentator_profile_url ?? null,
    scrapedAt: comment.timestamp ?? null,
    input: comment.input ?? null,
  };
}
