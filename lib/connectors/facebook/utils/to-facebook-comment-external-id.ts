const COMMENT_PREFIX = "comment:";
const ALIAS_PREFIXES = ["feedback:"];

function encode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64");
}

/**
 * Bright Data's `comment_id` is base64 of `comment:{postId}_{commentId}`, but
 * `parent_comment_id` arrives either as the bare numeric id or as base64 of
 * `feedback:{postId}_{commentId}`. Both are rewritten to the `comment:` form so
 * a reply links to the external id its parent was stored under.
 */
export function toFacebookCommentExternalId(
  commentId: string,
  postId: string,
): string {
  const trimmed = commentId.trim();

  if (/^\d+$/.test(trimmed)) {
    return encode(`${COMMENT_PREFIX}${postId}_${trimmed}`);
  }

  const decoded = Buffer.from(trimmed, "base64").toString("utf8");
  const alias = ALIAS_PREFIXES.find((prefix) => decoded.startsWith(prefix));

  if (alias && encode(decoded) === trimmed) {
    return encode(`${COMMENT_PREFIX}${decoded.slice(alias.length)}`);
  }

  return trimmed;
}
