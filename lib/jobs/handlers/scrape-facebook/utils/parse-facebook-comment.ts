import { brightDataFacebookCommentSchema } from "../types";
import type { BrightDataFacebookComment } from "../types";

export function parseFacebookComment(
  raw: unknown,
): BrightDataFacebookComment | null {
  const result = brightDataFacebookCommentSchema.safeParse(raw);

  if (!result.success) {
    console.warn(
      "[scrape-facebook] Skipping invalid comment item:",
      result.error.issues[0]?.message,
    );
    return null;
  }

  if (!result.data.comment_text.trim()) {
    console.warn(
      "[scrape-facebook] Skipping comment with empty comment_text:",
      result.data.comment_id,
    );
    return null;
  }

  return result.data;
}

export function parseFacebookComments(
  rawItems: unknown[],
): BrightDataFacebookComment[] {
  const comments: BrightDataFacebookComment[] = [];

  for (const item of rawItems) {
    const parsed = parseFacebookComment(item);
    if (parsed) {
      comments.push(parsed);
    }
  }

  return comments;
}
