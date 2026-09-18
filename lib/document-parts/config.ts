/** Safety cap on how many media parts are created per kind, per document. */
export const MAX_MEDIA_PARTS_PER_KIND = 10;

export const DOCUMENT_PART_CONTENT_TYPES = ["text", "image", "video"] as const;

export const DOCUMENT_PART_SCORE_SOURCES = [
  "llm",
  "placeholder",
  "failed",
] as const;
