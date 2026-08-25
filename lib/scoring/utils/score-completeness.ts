/**
 * Scores content completeness based on structural signals — no LLM required.
 *
 * Scoring breakdown (points out of 100):
 *   - Title present:                   20 pts
 *   - rawContent length >= 200 chars:  25 pts
 *   - rawContent length >= 1 000 chars: 20 pts  (stacks with above)
 *   - rawContent length >= 3 000 chars: 10 pts  (stacks with above)
 *   - metadata.url present:            15 pts
 *   - metadata.author present:          5 pts
 *   - metadata.published_at present:    5 pts
 *
 * @returns Score in [0, 1].
 */
export function scoreCompleteness(
  rawContent: string,
  title: string | null | undefined,
  metadata: Record<string, unknown>,
): number {
  let points = 0;

  if (title?.trim()) points += 20;

  const len = rawContent.length;
  if (len >= 200) points += 25;
  if (len >= 1_000) points += 20;
  if (len >= 3_000) points += 10;

  if (metadata["url"]) points += 15;
  if (metadata["author"]) points += 5;
  if (metadata["published_at"]) points += 5;

  return Math.min(points, 100) / 100;
}
