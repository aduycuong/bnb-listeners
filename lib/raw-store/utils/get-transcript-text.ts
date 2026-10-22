import type { ContentItemMedia } from "@/db/schema";

/** The transcripts of an item's media as one text; empty when it has none. */
export function getTranscriptText(media: ContentItemMedia[] | null | undefined): string {
  return (media ?? [])
    .flatMap((entry) => (entry.type === "transcript" && entry.text.trim() ? [entry.text.trim()] : []))
    .join("\n\n");
}
