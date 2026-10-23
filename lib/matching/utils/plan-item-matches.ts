import type { CompiledQuery } from "./compile-query";
import { matchQuery } from "./match-query";
import { tokenizeText } from "./tokenize-text";
import type { MatchItem } from "../types";

export type EntityHit = { entityIds: string[]; queryIds: string[]; terms: string[] };

export type PlannedMatch = EntityHit & {
  item: MatchItem;
  matchType: "direct" | "context";
};

export type MatchPlan = {
  /** Tier 1 is enough: written as relevant `lexical` mentions. */
  certain: PlannedMatch[];
  /** Tier 2 decides; `entityIds` are the candidates to ask about. */
  pending: PlannedMatch[];
};

type LexicalHit = { certain: EntityHit | null; uncertain: EntityHit | null };

function collect(matches: ReturnType<typeof matchQuery>[]): EntityHit | null {
  const found = matches.filter((match) => match !== null);
  if (found.length === 0) return null;
  return {
    entityIds: [...new Set(found.flatMap((match) => (match.entityId ? [match.entityId] : [])))],
    queryIds: [...new Set(found.map((match) => match.queryId))],
    terms: [...new Set(found.flatMap((match) => match.terms))],
  };
}

export function lexicalHit(text: string, queries: CompiledQuery[]): LexicalHit {
  const tokens = tokenizeText(text);
  const matches = queries.map((query) => matchQuery(tokens, query));
  return {
    certain: collect(matches.filter((match) => match && !match.needsConfirmation)),
    uncertain: collect(matches.filter((match) => match?.needsConfirmation)),
  };
}

function mergeHits(a: EntityHit | null, b: EntityHit | null): EntityHit | null {
  if (!a || !b) return a ?? b;
  return {
    entityIds: [...new Set([...a.entityIds, ...b.entityIds])],
    queryIds: [...new Set([...a.queryIds, ...b.queryIds])],
    terms: [...new Set([...a.terms, ...b.terms])],
  };
}

/**
 * The item's text first, then its transcript. A hit only in the transcript
 * always goes to tier 2: speech recognition misspells names, and a video can
 * name an entity in passing.
 */
export function itemLexicalHit(item: MatchItem, queries: CompiledQuery[]): LexicalHit {
  const written = lexicalHit(item.text, queries);
  if (written.certain || written.uncertain || !item.transcript) return written;
  const spoken = lexicalHit(item.transcript, queries);
  return { certain: null, uncertain: mergeHits(spoken.certain, spoken.uncertain) };
}

/**
 * Tier 1 for a set of items. Comments and replies that do not name an entity
 * become context candidates when their root post matched (lexically, or as a
 * stored relevant mention passed in `rootEntities`).
 */
export function planItemMatches(params: {
  items: MatchItem[];
  /** Root posts of the items, including ones outside `items`. */
  roots: Map<string, MatchItem>;
  queries: CompiledQuery[];
  /** Entity ids of roots that are already relevant mentions. */
  rootEntities?: Map<string, string[]>;
}): MatchPlan {
  const plan: MatchPlan = { certain: [], pending: [] };
  const rootCache = new Map<string, string[]>();

  const entitiesOfRoot = (rootId: string): string[] => {
    const cached = rootCache.get(rootId);
    if (cached) return cached;
    const stored = params.rootEntities?.get(rootId) ?? [];
    const root = params.roots.get(rootId);
    const hit = root ? itemLexicalHit(root, params.queries) : null;
    const ids = [
      ...new Set([
        ...stored,
        ...(hit?.certain?.entityIds ?? []),
        ...(hit?.uncertain?.entityIds ?? []),
      ]),
    ];
    rootCache.set(rootId, ids);
    return ids;
  };

  for (const item of params.items) {
    const hit = itemLexicalHit(item, params.queries);
    if (hit.certain) {
      plan.certain.push({ item, matchType: "direct", ...hit.certain });
      continue;
    }
    if (hit.uncertain) {
      plan.pending.push({ item, matchType: "direct", ...hit.uncertain });
      continue;
    }
    if (item.kind === "post" || !item.rootId) continue;

    const entityIds = entitiesOfRoot(item.rootId);
    if (entityIds.length > 0) {
      plan.pending.push({ item, matchType: "context", entityIds, queryIds: [], terms: [] });
    }
  }

  return plan;
}
