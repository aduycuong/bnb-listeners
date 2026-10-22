import { COLLECT_CONFIG } from "@/lib/connectors/config";
import { registerSource } from "@/lib/raw-store/services/register-source";
import type { RegisterSourceResult } from "@/lib/raw-store/types";

import { buildTiktokSearchSourceKey } from "../tiktok/utils/build-tiktok-search-source-key";

type RegisterTiktokSearchSourceParams = {
  keyword: string;
  /** ISO 3166-1 alpha-2 code; defaults to the configured search region. */
  region?: string;
};

/**
 * Registers a TikTok keyword search in `sources`. The search is the source:
 * its `external_id` is `<REGION>:<keyword>` and it has no URL, so the same
 * keyword in the same region is one source however it is spelled.
 */
export async function registerTiktokSearchSource(
  params: RegisterTiktokSearchSourceParams,
): Promise<RegisterSourceResult> {
  const region = (params.region ?? COLLECT_CONFIG.tiktok.search.region).toUpperCase();
  const externalId = buildTiktokSearchSourceKey({ keyword: params.keyword, region });
  const keyword = externalId.slice(region.length + 1);

  return registerSource({
    platform: "tiktok",
    sourceType: "search",
    externalId,
    url: null,
    name: params.keyword.trim().replace(/\s+/g, " "),
    metadata: { keyword, region },
  });
}
