import { APIError } from "@/lib/exposers/api-error";

import type { PostConnectorKey } from "../constants";
import { parseTiktokSearchSourceKey } from "../tiktok/utils/build-tiktok-search-source-key";
import { getPostConnectorKey } from "./get-post-connector-key";

type PostRunSource = {
  id: string;
  platform: string;
  sourceType: string;
  externalId: string;
  url: string | null;
  metadata: Record<string, unknown>;
};

type BuildPostRunParamsOptions = {
  /** Start of the window (ISO); ignored by search sources, which look back a fixed window. */
  since?: string;
  /** Newest stored post before the run (ISO), to count late arrivals. */
  newestKnownAt?: string;
  /** Hard cap on delivered records. */
  maxRecords?: number;
};

export type PostRun = {
  connector: PostConnectorKey;
  params: Record<string, unknown>;
};

/** The connector and params of a post run for this source. */
export function buildPostRunParams(
  source: PostRunSource,
  options: BuildPostRunParamsOptions,
): PostRun {
  const connector = getPostConnectorKey(source);
  const notCollectable = (reason: string) =>
    new APIError(
      "ERR_SOURCE_NOT_COLLECTABLE",
      `${reason} (${source.platform} ${source.sourceType} source ${source.id}).`,
      400,
    );

  if (!connector) throw notCollectable("No connector");

  if (connector === "tiktok-search") {
    const search = parseTiktokSearchSourceKey(source.externalId);
    if (!search) throw notCollectable("Search source has no keyword");

    return {
      connector,
      params: {
        keyword: search.keyword,
        region: search.region,
        ...(options.maxRecords !== undefined && { maxRecords: options.maxRecords }),
      },
    };
  }

  if (!source.url || !options.since) throw notCollectable("Source has no URL or window");

  const secUid = source.metadata.secUid;

  return {
    connector,
    params: {
      url: source.url,
      since: options.since,
      ...(connector === "tiktok-posts" && typeof secUid === "string" && { secUid }),
      ...(options.newestKnownAt && { newestKnownAt: options.newestKnownAt }),
      ...(options.maxRecords !== undefined && { maxRecords: options.maxRecords }),
    },
  };
}
