/**
 * Scores a source's credibility based on its source_key.
 *
 * Currently a placeholder — returns a neutral score for all sources.
 * Replace with a lookup table or external signal (e.g., domain authority,
 * editorial policy flag) as the source registry matures.
 *
 * @returns Score in [0, 1]. Higher = more credible.
 */
export function scoreSourceCredibility(_sourceKey: string): number {
  // TODO: implement source reputation lookup (e.g. db/config table keyed by source_key)
  return 0.7;
}
