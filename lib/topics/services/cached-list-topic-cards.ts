import { unstable_cache } from "next/cache";

import type { WorkspaceContext } from "@/lib/workspaces/types";

import {
  TOPIC_CARD_CACHE_SECONDS,
  type TopicCardPeriodPreset,
} from "../topic-card-config";
import type { ListTopicCardsParams, ListTopicCardsResult } from "../types";
import { listTopicCards } from "./list-topic-cards";

// ---------------------------------------------------------------------------
// Base fetcher — only workspaceId is passed as context because topic card data
// is workspace-scoped and identical for all members; caching by userId or
// role would needlessly multiply cache entries.
// ---------------------------------------------------------------------------

async function fetchTopicCards(
  params: ListTopicCardsParams,
  workspaceId: string,
): Promise<ListTopicCardsResult> {
  const ctx: WorkspaceContext = {
    userId: "",
    workspaceId,
    permission: "read",
  };
  return listTopicCards(params, ctx);
}

// ---------------------------------------------------------------------------
// Three unstable_cache buckets — one per unique TTL tier.
// Next.js uses (keyParts + serialized args) as the composite cache key, so
// the same preset with different params or workspaces never collides.
// Different TTL tiers use different keyParts to keep their entries separate.
// ---------------------------------------------------------------------------

const cached600 = unstable_cache(fetchTopicCards, ["topic-cards", "ttl-600"], {
  revalidate: 600,
});

const cached900 = unstable_cache(fetchTopicCards, ["topic-cards", "ttl-900"], {
  revalidate: 900,
});

const cached3600 = unstable_cache(fetchTopicCards, ["topic-cards", "ttl-3600"], {
  revalidate: 3600,
});

/** Unique TTL values → their cache bucket. */
const CACHE_BUCKET: Record<600 | 900 | 3600, typeof cached600> = {
  600:  cached600,
  900:  cached900,
  3600: cached3600,
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Cached wrapper around `listTopicCards`.
 *
 * TTL is determined per period preset via `TOPIC_CARD_CACHE_SECONDS`.
 * When the preset is `custom` (TTL = null) the underlying service is called
 * directly without any caching.
 *
 * Cache is scoped to (workspaceId, params) — all workspace members share the
 * same cached result for a given query.
 */
export async function cachedListTopicCards(
  params: ListTopicCardsParams,
  ctx: WorkspaceContext,
): Promise<ListTopicCardsResult> {
  const ttl = TOPIC_CARD_CACHE_SECONDS[params.period as TopicCardPeriodPreset];

  if (ttl === null || ttl === undefined) {
    return listTopicCards(params, ctx);
  }

  const bucket = CACHE_BUCKET[ttl as 600 | 900 | 3600];
  return bucket(params, ctx.workspaceId);
}
