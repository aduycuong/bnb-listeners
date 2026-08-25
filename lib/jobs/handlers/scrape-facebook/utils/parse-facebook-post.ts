import { brightDataFacebookPostSchema } from "../types";
import type { BrightDataFacebookPost } from "../types";

/**
 * Safely parses a single raw Bright Data item into a typed FacebookPost.
 * Returns null and logs a warning when the item fails validation so the
 * caller can skip it without crashing the entire batch.
 */
export function parseFacebookPost(raw: unknown): BrightDataFacebookPost | null {
  const result = brightDataFacebookPostSchema.safeParse(raw);

  if (!result.success) {
    console.warn(
      "[scrape-facebook] Skipping invalid post item:",
      JSON.stringify(result.error.issues),
    );
    return null;
  }

  return result.data;
}

/**
 * Parses an array of raw Bright Data items, skipping any that fail validation.
 * Returns only the successfully parsed posts.
 */
export function parseFacebookPosts(rawItems: unknown[]): BrightDataFacebookPost[] {
  const posts: BrightDataFacebookPost[] = [];

  for (const item of rawItems) {
    const post = parseFacebookPost(item);
    if (post !== null) {
      posts.push(post);
    }
  }

  return posts;
}
