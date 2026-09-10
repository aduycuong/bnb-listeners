import { MEDIA_SNIPPET_CHARACTERS } from "./config";

/**
 * Flattens the post text into a short single-line snippet that gets paired with
 * each media item, so the multimodal input carries textual grounding instead of
 * a bare image or video.
 */
export function buildMediaSnippet(content: string): string {
  const flat = content.trim().replace(/\s+/g, " ");
  if (flat.length <= MEDIA_SNIPPET_CHARACTERS) return flat;
  return `${flat.slice(0, MEDIA_SNIPPET_CHARACTERS)}…`;
}
