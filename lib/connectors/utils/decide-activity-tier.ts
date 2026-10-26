import type { ActivityTier } from "../constants";
import type { CollectSettings } from "../settings";

/** Automatic tier for a posting rate; never `paused` (that is set by hand). */
export function decideActivityTier(
  postsPerDay: number,
  minPostsPerDay: CollectSettings["tiers"]["minPostsPerDay"],
): Exclude<ActivityTier, "paused"> {
  if (postsPerDay >= minPostsPerDay.hot) return "hot";
  if (postsPerDay >= minPostsPerDay.normal) return "normal";
  return "low";
}
