import { getSettings } from "@/lib/settings/services/get-settings";

import type { CollectSettings } from "../settings";

/** Collection settings in use (admin overrides over `COLLECT_CONFIG`). */
export async function getCollectSettings(): Promise<CollectSettings> {
  const values = await getSettings([
    "collect-tiers",
    "collect-tiktok-search",
    "collect-comment-refresh",
  ]);

  return {
    tiers: values["collect-tiers"],
    tiktokSearch: values["collect-tiktok-search"],
    commentRefresh: values["collect-comment-refresh"],
  };
}
