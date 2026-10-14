import { gte } from "drizzle-orm";

import { contentItems } from "@/db/schema";
import { toQueryInclude } from "@/lib/projects/utils/to-query-include";

import { MATCH_CONFIG } from "../config";
import type { PreviewMatchesParams, PreviewMatchesResult } from "../types";
import { compileQuery } from "../utils/compile-query";
import { matchQuery } from "../utils/match-query";
import { tokenizeText } from "../utils/tokenize-text";
import { loadMatchItems } from "./load-match-items";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Tier 1 counts per entity over recent items of the chosen sources, for the wizard. No LLM. */
export async function previewMatches(params: PreviewMatchesParams): Promise<PreviewMatchesResult> {
  const days = MATCH_CONFIG.previewDays;
  const items = await loadMatchItems({
    sourceIds: params.sourceIds,
    where: gte(contentItems.publishedAt, new Date(Date.now() - days * DAY_MS)),
  });
  items.sort((a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0));
  const tokens = new Map(items.map((item) => [item.id, tokenizeText(item.text)]));

  const entities = params.entities.map((entity) => {
    const query = compileQuery({
      id: entity.id,
      entityId: entity.id,
      include: toQueryInclude(entity),
      withTerms: entity.withTerms,
      exclude: entity.exclude,
      proximity: null,
      ambiguous: entity.ambiguousAliases,
    });

    const result = {
      id: entity.id,
      posts: 0,
      comments: 0,
      needsConfirmation: 0,
      contextComments: 0,
      samples: [] as PreviewMatchesResult["entities"][number]["samples"],
    };
    const matchedRoots = new Set<string>();
    const direct = new Set<string>();

    for (const item of items) {
      const match = matchQuery(tokens.get(item.id)!, query);
      if (!match) continue;
      direct.add(item.id);
      if (item.kind === "post") {
        result.posts += 1;
        matchedRoots.add(item.id);
      } else {
        result.comments += 1;
      }
      if (match.needsConfirmation) result.needsConfirmation += 1;
      if (result.samples.length < MATCH_CONFIG.previewSamples) {
        result.samples.push({
          kind: item.kind,
          text: item.text.slice(0, 280),
          terms: match.terms,
          needsConfirmation: match.needsConfirmation,
          publishedAt: item.publishedAt?.toISOString() ?? null,
        });
      }
    }

    for (const item of items) {
      if (item.kind !== "post" && item.rootId && matchedRoots.has(item.rootId) && !direct.has(item.id)) {
        result.contextComments += 1;
      }
    }

    return result;
  });

  return { days, scanned: items.length, entities };
}
