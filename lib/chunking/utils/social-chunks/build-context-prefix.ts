import type { ChunkSourceContext } from "./types";

/**
 * Builds the single-line context header prepended to every chunk before
 * embedding, e.g. `[Tác giả: Nguyễn A | Nguồn: Group Du lịch | Ngày: 2026-09-05]`.
 *
 * Returns an empty string when no field is usable, so callers can skip the
 * prefix entirely rather than emit an empty bracket.
 */
export function buildContextPrefix(context?: ChunkSourceContext): string {
  if (!context) return "";

  const parts: string[] = [];
  const author = context.author?.trim();
  const sourceName = context.sourceName?.trim();
  const dateKey = context.publishedAt ? toDateKey(context.publishedAt) : null;

  if (author) parts.push(`Tác giả: ${author}`);
  if (sourceName) parts.push(`Nguồn: ${sourceName}`);
  if (dateKey) parts.push(`Ngày: ${dateKey}`);

  for (const label of context.labels ?? []) {
    const trimmed = label.trim();
    if (trimmed) parts.push(trimmed);
  }

  return parts.length > 0 ? `[${parts.join(" | ")}]` : "";
}

function toDateKey(value: Date | string): string | null {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}
