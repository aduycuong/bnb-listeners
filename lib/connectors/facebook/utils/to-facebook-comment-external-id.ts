const COMMENT_ID_PREFIX = "comment:";

/**
 * Bright Data's `comment_id` is base64 of `comment:{postId}_{commentId}`, but
 * `parent_comment_id` may be the bare numeric id. Builds the base64 form so a
 * reply links to the same external id its parent was stored under.
 */
export function toFacebookCommentExternalId(
  commentId: string,
  postId: string,
): string {
  const trimmed = commentId.trim();

  if (/^\d+$/.test(trimmed)) {
    return Buffer.from(`${COMMENT_ID_PREFIX}${postId}_${trimmed}`).toString(
      "base64",
    );
  }

  return trimmed;
}
