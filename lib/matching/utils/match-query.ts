import type { CompiledQuery } from "./compile-query";
import { findTermHits, type TermHit } from "./compile-term";
import type { TextToken } from "./tokenize-text";

export type QueryMatch = {
  queryId: string;
  entityId: string | null;
  terms: string[];
  /** Only ambiguous terms or diacritic-less forms matched; tier 2 must confirm. */
  needsConfirmation: boolean;
};

/** Tier 1 for one query on one tokenized text; null when it does not match. */
export function matchQuery(text: TextToken[], query: CompiledQuery): QueryMatch | null {
  if (text.length === 0) return null;

  const includeHits: { term: string; hit: TermHit }[] = [];
  for (const term of query.include) {
    for (const hit of findTermHits(text, term)) includeHits.push({ term: term.term, hit });
  }
  if (includeHits.length === 0) return null;

  if (query.exclude.some((term) => findTermHits(text, term).length > 0)) return null;

  let usable = includeHits;
  if (query.withTerms.length > 0) {
    const withHits = query.withTerms.flatMap((term) => findTermHits(text, term));
    if (withHits.length === 0) return null;
    if (query.proximity !== null) {
      const proximity = query.proximity;
      usable = includeHits.filter(({ hit }) =>
        withHits.some(
          (other) =>
            Math.abs(other.start - hit.end) <= proximity ||
            Math.abs(hit.start - other.end) <= proximity,
        ),
      );
      if (usable.length === 0) return null;
    }
  }

  const certain = usable.some(
    ({ term, hit }) =>
      hit.kind === "exact" && !query.ambiguous.has(term.toLocaleLowerCase("vi")),
  );

  return {
    queryId: query.id,
    entityId: query.entityId,
    terms: [...new Set(usable.map(({ term }) => term))],
    needsConfirmation: !certain,
  };
}
