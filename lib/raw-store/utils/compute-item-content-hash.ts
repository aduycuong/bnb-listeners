import type { ContentItemMedia } from "@/db/schema";

import { computeContentHash } from "./compute-content-hash";
import { getTranscriptText } from "./get-transcript-text";

/**
 * `content_items.content_hash`: the text plus any transcript, so a transcript
 * that arrives later re-runs Match and Enrich. Items without one keep the
 * hash of their text alone.
 */
export function computeItemContentHash(text: string, media: ContentItemMedia[]): string {
  const transcript = getTranscriptText(media);
  return computeContentHash(transcript ? `${text}\n\n${transcript}` : text);
}
