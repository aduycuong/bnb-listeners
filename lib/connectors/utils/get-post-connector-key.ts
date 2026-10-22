import type { PostConnectorKey } from "../constants";

type PostScanSource = {
  platform: string;
  sourceType: string;
};

/**
 * The connector that scans a source for new posts, or null when none does
 * (e.g. synthetic sources, platforms without a connector).
 */
export function getPostConnectorKey(source: PostScanSource): PostConnectorKey | null {
  if (source.platform === "facebook") return "facebook-posts";

  if (source.platform === "tiktok") {
    if (source.sourceType === "channel") return "tiktok-posts";
    if (source.sourceType === "search") return "tiktok-search";
  }

  return null;
}
