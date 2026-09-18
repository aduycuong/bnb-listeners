import type { Document, NewDocumentPart } from "@/db/schema";
import { normalizeMediaUrls } from "@/lib/common/normalize-media-urls";

import { MAX_MEDIA_PARTS_PER_KIND } from "../config";

/**
 * Derives the insertable part rows for a document: part 0 is the whole text
 * body (skipped when blank), followed by one part per image URL and one per
 * video URL from `metadata.imageUrls` / `metadata.videoUrls`.
 *
 * Pure — no database access — so it can be unit-tested and reused by scripts.
 */
export function buildPartsFromDocument(doc: Document): NewDocumentPart[] {
  const parts: NewDocumentPart[] = [];
  const text = doc.rawContent.trim();

  if (text) {
    parts.push({
      documentId: doc.id,
      partIndex: parts.length,
      contentType: "text",
      value: text,
    });
  }

  const imageUrls = normalizeMediaUrls(
    readStringArray(doc.metadata, "imageUrls"),
    MAX_MEDIA_PARTS_PER_KIND,
  );
  const videoUrls = normalizeMediaUrls(
    readStringArray(doc.metadata, "videoUrls"),
    MAX_MEDIA_PARTS_PER_KIND,
  );

  for (const url of imageUrls) {
    parts.push({
      documentId: doc.id,
      partIndex: parts.length,
      contentType: "image",
      value: url,
    });
  }

  for (const url of videoUrls) {
    parts.push({
      documentId: doc.id,
      partIndex: parts.length,
      contentType: "video",
      value: url,
    });
  }

  return parts;
}

function readStringArray(
  metadata: Record<string, unknown>,
  key: string,
): string[] {
  const value = metadata[key];
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}
