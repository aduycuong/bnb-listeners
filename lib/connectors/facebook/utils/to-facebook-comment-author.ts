import type { NormalizedAuthor } from "@/lib/raw-store/types";

import type { BrightDataFacebookComment } from "../schema";

const FACEBOOK_ORIGIN = "https://www.facebook.com";

/** `/people/{name}/{numericId}/` and `/profile.php?id={numericId}`. */
const NUMERIC_PROFILE_PATTERNS = [
  /facebook\.com\/people\/[^/]+\/(\d+)\/?$/,
  /facebook\.com\/profile\.php\?id=(\d+)/,
];

/** `/{username}` with nothing after it. */
const VANITY_PROFILE_PATTERN = /facebook\.com\/([A-Za-z0-9.]+)\/?$/;

/**
 * Picks the most stable id Bright Data gives for a commenter. `user_id` is
 * either the numeric Facebook id (stable) or a `pfbid…` token, Facebook's
 * anonymized form of a user id, which changes between scrapes of the same
 * comment (probes of 2026-10-12/13) and cannot be turned back into the
 * numeric id. The profile link (`commentator_profile`) often carries the
 * numeric id or a username, so it is tried before falling back to the token:
 *
 * 1. numeric `user_id`, or a numeric id inside the profile link (same id
 *    space as post authors' `profile_id`);
 * 2. username link, stored as the profile URL (like post authors without a
 *    `profile_id`);
 * 3. the `pfbid` token, flagged `idStable: false` so author counts can treat
 *    it as unreliable.
 */
export function toFacebookCommentAuthor(
  comment: BrightDataFacebookComment,
): NormalizedAuthor | null {
  const userId = comment.user_id?.trim() || null;
  const profile = comment.commentator_profile?.trim() || null;
  const name = comment.user_name?.trim() || null;
  const avatarUrl = comment.commentator_profile_url ?? null;

  const numericId =
    (userId && /^\d+$/.test(userId) ? userId : null) ??
    (profile ? matchNumericProfileId(profile) : null);
  const username = profile?.split("?")[0].match(VANITY_PROFILE_PATTERN)?.[1] ?? null;
  const profileUrl = username ? `${FACEBOOK_ORIGIN}/${username}` : profile;

  if (numericId) {
    return {
      externalId: numericId,
      name,
      url: profileUrl ?? `${FACEBOOK_ORIGIN}/profile.php?id=${numericId}`,
      avatarUrl,
    };
  }

  if (username) {
    return { externalId: profileUrl!, name, url: profileUrl, avatarUrl };
  }

  if (!userId) return null;

  return {
    externalId: userId,
    name,
    url: profile,
    avatarUrl,
    metadata: { idStable: false },
  };
}

function matchNumericProfileId(profile: string): string | null {
  for (const pattern of NUMERIC_PROFILE_PATTERNS) {
    const id = profile.match(pattern)?.[1];
    if (id) return id;
  }
  return null;
}
