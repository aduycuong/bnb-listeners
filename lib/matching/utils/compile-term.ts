import { MATCH_CONFIG } from "../config";
import { tokenizeText, type TextToken } from "./tokenize-text";

export type CompiledTerm = {
  term: string;
  tokens: TextToken[];
  /** Short or all-caps aliases (`PDR`, `TA`) match only the exact token, case-sensitive. */
  strict: boolean;
  hasDiacritics: boolean;
  /** `La Pura` also matches the single token `lapura`. */
  compact: string | null;
};

export type TermHit = {
  start: number;
  end: number;
  /** exact: same letters and marks. plain: matched only once diacritics were dropped. */
  kind: "exact" | "plain";
};

export function compileTerm(term: string): CompiledTerm | null {
  const tokens = tokenizeText(term);
  if (tokens.length === 0) return null;

  const letters = term.replace(/[^\p{L}]/gu, "");
  const strict =
    tokens.length === 1 &&
    (term.trim().length <= MATCH_CONFIG.strictTermMaxLength ||
      (letters.length > 1 &&
        letters.length <= MATCH_CONFIG.strictUpperMaxLength &&
        letters === letters.toLocaleUpperCase("vi")));

  return {
    term,
    tokens,
    strict,
    hasDiacritics: tokens.some((token) => token.lower !== token.plain),
    compact: tokens.length > 1 ? tokens.map((token) => token.plain).join("") : null,
  };
}

/** Every place the term occurs in `text`, as token positions. */
export function findTermHits(text: TextToken[], term: CompiledTerm): TermHit[] {
  const hits: TermHit[] = [];
  const size = term.tokens.length;

  for (let start = 0; start + size <= text.length; start++) {
    if (term.strict) {
      if (text[start].raw === term.tokens[0].raw) hits.push({ start, end: start, kind: "exact" });
      continue;
    }

    let plain = true;
    let exact = true;
    for (let offset = 0; offset < size; offset++) {
      const token = text[start + offset];
      const want = term.tokens[offset];
      if (token.plain !== want.plain) {
        plain = false;
        break;
      }
      if (token.lower !== want.lower) exact = false;
    }

    if (plain) {
      // A term written without diacritics accepts any marks; one written with them must match them.
      const kind = exact || !term.hasDiacritics ? "exact" : "plain";
      hits.push({ start, end: start + size - 1, kind });
    } else if (term.compact && text[start].plain === term.compact) {
      hits.push({ start, end: start, kind: term.hasDiacritics ? "plain" : "exact" });
    }
  }

  return hits;
}
