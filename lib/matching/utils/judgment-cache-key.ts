import { createHash } from "node:crypto";

import { MATCH_CONFIG } from "../config";
import type { MatchEntity, MatchItem } from "../types";

/** Same item, same root and same entity terms give the same tier 2 answer. */
export function judgmentCacheKey(entity: MatchEntity, root: MatchItem, item: MatchItem): string {
  const entityKey = JSON.stringify({
    name: entity.name,
    role: entity.role,
    terms: [...entity.terms].sort(),
    exclude: [...entity.exclude].sort(),
  });
  return createHash("sha256")
    .update(
      JSON.stringify([
        MATCH_CONFIG.promptVersion,
        MATCH_CONFIG.model,
        entityKey,
        root.contentHash,
        item.contentHash,
        item.id === root.id,
      ]),
    )
    .digest("hex");
}
