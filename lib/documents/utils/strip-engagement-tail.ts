/**
 * Marker opening the legacy engagement footer that used to be appended to
 * Facebook post rawContent (`---` separator, then author and counter lines).
 *
 * Exported so callers can select the affected rows in SQL against the same
 * definition the stripper uses.
 */
export const LEGACY_ENGAGEMENT_TAIL_MARKER = "\n\n---\n**Tác giả:**";

/**
 * Removes the legacy engagement footer from a document's rawContent.
 *
 * Ingestion no longer writes this footer — counters live in real columns — so
 * this exists purely to migrate rows written before that change. Embedding the
 * footer was actively harmful: the numbers carry no semantic signal, while the
 * identical boilerplate pulled every short post toward the same region of
 * vector space.
 *
 * Safe to call on already-clean content — it only trims whitespace then.
 */
export function stripEngagementTail(rawContent: string): string {
  const markerIndex = rawContent.lastIndexOf(LEGACY_ENGAGEMENT_TAIL_MARKER);
  if (markerIndex === -1) return rawContent.trim();
  return rawContent.slice(0, markerIndex).trim();
}
