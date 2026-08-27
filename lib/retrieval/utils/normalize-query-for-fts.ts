/**
 * Normalizes a natural-language query into a string suitable for
 * `websearch_to_tsquery('simple', ...)`.
 *
 * `websearch_to_tsquery` already handles multi-word input, quoted phrases,
 * and OR/AND operators, so minimal transformation is needed here.
 * We only strip characters that would cause a parse error.
 */
export function normalizeQueryForFts(query: string): string {
  return query
    .trim()
    .replace(/[\\:*!]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
