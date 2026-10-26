import { COLLECT_CONFIG } from "@/lib/connectors/config";
import type { CollectSettings } from "@/lib/connectors/settings";

import type { AdminTierRules } from "../types";

export function toAdminTierRules(settings: CollectSettings): AdminTierRules {
  return {
    intervalHours: settings.tiers.intervalHours,
    minPostsPerDay: settings.tiers.minPostsPerDay,
    windowDays: settings.tiers.windowDays,
    searchIntervalHours: settings.tiktokSearch.intervalHours,
    maxRecordsPerRun: COLLECT_CONFIG.posts.maxRecordsPerRun,
  };
}
