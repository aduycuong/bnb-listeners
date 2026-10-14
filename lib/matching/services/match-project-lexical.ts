import { and, eq, inArray } from "drizzle-orm";

import { contentItems, mentions } from "@/db/schema";
import { db } from "@/lib/db";

import type { MatchItem, MatchLexicalResult } from "../types";
import { planItemMatches } from "../utils/plan-item-matches";
import { loadMatchItems } from "./load-match-items";
import { loadProjectMatchContext } from "./load-project-match-context";
import { toMentionRow, writeMentions } from "./write-mentions";

/**
 * Tier 1 for a project. Full mode scans every item of its sources; incremental
 * mode only the items one collect run wrote. Certain matches are written now;
 * threads needing tier 2 are returned for `judgeThreads`.
 */
export async function matchProjectLexical(params: {
  projectId: string;
  collectRunId?: string;
}): Promise<MatchLexicalResult> {
  const ctx = await loadProjectMatchContext({ projectId: params.projectId });

  const items = await loadMatchItems({
    sourceIds: ctx.sourceIds,
    where: params.collectRunId ? eq(contentItems.collectRunId, params.collectRunId) : undefined,
  });

  const roots = new Map<string, MatchItem>(
    items.filter((item) => item.kind === "post").map((item) => [item.id, item]),
  );
  const rootEntities = new Map<string, string[]>();

  if (params.collectRunId) {
    // New comments often belong to posts collected earlier.
    const missing = [
      ...new Set(items.flatMap((item) => (item.rootId && !roots.has(item.rootId) ? [item.rootId] : []))),
    ];
    if (missing.length > 0) {
      for (const root of await loadMatchItems({
        sourceIds: ctx.sourceIds,
        where: inArray(contentItems.id, missing),
      })) {
        roots.set(root.id, root);
      }
      const stored = await db
        .select({ id: mentions.contentItemId, entityIds: mentions.matchedEntityIds })
        .from(mentions)
        .where(
          and(
            eq(mentions.projectId, ctx.projectId),
            eq(mentions.isRelevant, true),
            inArray(mentions.contentItemId, missing),
          ),
        );
      for (const row of stored) rootEntities.set(row.id, row.entityIds);
    }
  }

  const plan = planItemMatches({ items, roots, queries: ctx.queries, rootEntities });

  await writeMentions(
    plan.certain.map((match) =>
      toMentionRow(ctx.projectId, ctx.signature, match, { tier: "lexical", isRelevant: true }),
    ),
  );

  return {
    signature: ctx.signature,
    storedSignature: ctx.storedSignature,
    pendingRootIds: [
      ...new Set(plan.pending.map(({ item }) => (item.kind === "post" ? item.id : (item.rootId ?? item.id)))),
    ],
    stats: {
      items: items.length,
      direct: plan.certain.length,
      pendingItems: plan.pending.length,
    },
  };
}
