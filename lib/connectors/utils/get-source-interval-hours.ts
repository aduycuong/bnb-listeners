import { COLLECT_CONFIG } from "../config";
import type { ActivityTier } from "../constants";

type IntervalSource = {
  platform: string;
  sourceType: string;
  activityTier: string;
};

/**
 * Hours between two post runs of a source; null for a paused source. Channels
 * and groups follow their activity tier. A TikTok keyword search has no posts
 * per day to measure (each run is a sample of the same window), so it runs at
 * a fixed interval.
 */
export function getSourceIntervalHours(source: IntervalSource): number | null {
  if (source.activityTier === "paused") return null;

  if (source.platform === "tiktok" && source.sourceType === "search") {
    return COLLECT_CONFIG.tiktok.search.intervalHours;
  }

  return COLLECT_CONFIG.tiers.intervalHours[
    source.activityTier as Exclude<ActivityTier, "paused">
  ];
}
