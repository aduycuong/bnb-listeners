import { sql } from "drizzle-orm";

import { mentions, type NewMention } from "@/db/schema";
import { db } from "@/lib/db";

import { MATCH_CONFIG } from "../config";
import type { PlannedMatch } from "../utils/plan-item-matches";

export function toMentionRow(
  projectId: string,
  signature: string,
  match: PlannedMatch,
  decision: {
    tier: "lexical" | "llm";
    isRelevant: boolean;
    entityIds?: string[];
    reason?: string | null;
  },
): NewMention {
  const { item } = match;
  return {
    projectId,
    contentItemId: item.id,
    rootItemId: item.rootId ?? item.id,
    kind: item.kind,
    platform: item.platform,
    sourceId: item.sourceId,
    authorId: item.authorId,
    publishedAt: item.publishedAt,
    origin: item.origin,
    matchedQueryIds: match.queryIds,
    matchedEntityIds: decision.entityIds ?? match.entityIds,
    matchedTerms: match.terms,
    matchType: match.matchType,
    matchTier: decision.tier,
    isRelevant: decision.isRelevant,
    matchReason: decision.reason ?? null,
    matchSignature: signature,
  };
}

/** Upserts by (project, item). A relevance the user corrected by hand is kept. */
export async function writeMentions(rows: NewMention[]): Promise<void> {
  for (let offset = 0; offset < rows.length; offset += MATCH_CONFIG.writeBatchSize) {
    const batch = rows.slice(offset, offset + MATCH_CONFIG.writeBatchSize);
    await db
      .insert(mentions)
      .values(batch)
      .onConflictDoUpdate({
        target: [mentions.projectId, mentions.contentItemId],
        set: {
          rootItemId: sql`excluded.root_item_id`,
          matchedQueryIds: sql`excluded.matched_query_ids`,
          matchedEntityIds: sql`excluded.matched_entity_ids`,
          matchedTerms: sql`excluded.matched_terms`,
          matchType: sql`excluded.match_type`,
          matchTier: sql`excluded.match_tier`,
          isRelevant: sql`case when ${mentions.userCorrected} then ${mentions.isRelevant} else excluded.is_relevant end`,
          matchReason: sql`excluded.match_reason`,
          matchSignature: sql`excluded.match_signature`,
          publishedAt: sql`excluded.published_at`,
          updatedAt: new Date(),
        },
      });
  }
}
