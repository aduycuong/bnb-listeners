import type { ChunkSourceContext } from "./types";

/**
 * Builds the single-line context header prepended to every chunk before
 * embedding, e.g. `[Tác giả: Nguyễn A | Nguồn: Group Du lịch]`.
 *
 * The publish date is deliberately left out: it adds nothing to semantic
 * similarity and retrieval already returns `documents.published_at`.
 *
 * Returns an empty string when no field is usable, so callers can skip the
 * prefix entirely rather than emit an empty bracket.
 */
export function buildContextPrefix(context?: ChunkSourceContext): string {
  if (!context) return "";

  const parts: string[] = [];
  const author = context.author?.trim();
  const sourceOriginName = context.sourceOriginName?.trim();

  if (author) parts.push(`Tác giả: ${author}`);
  if (sourceOriginName) parts.push(`Nguồn: ${sourceOriginName}`);

  for (const label of context.labels ?? []) {
    const trimmed = label.trim();
    if (trimmed) parts.push(trimmed);
  }

  return parts.length > 0 ? `[${parts.join(" | ")}]` : "";
}
