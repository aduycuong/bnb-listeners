import type { DocumentPartRow } from "@/lib/document-parts/types";

/**
 * Assembles the classifier's `rawContent` from a document's eligible parts:
 * the text part verbatim, followed by one labelled line per media part with
 * its LLM summary. Parts that did not pass the score thresholds never reach
 * the classifier, so terms are only assigned for content that is actually
 * indexed.
 *
 * Returns an empty string when nothing is eligible — callers should skip
 * classification in that case.
 */
export function buildClassifierContentFromParts(
  parts: DocumentPartRow[],
): string {
  const sections: string[] = [];

  for (const part of parts) {
    if (part.contentType === "text") {
      const text = part.value.trim();
      if (text) sections.push(text);
      continue;
    }

    const summary = part.summary?.trim();
    if (!summary) continue;

    const label = part.contentType === "image" ? "Hình ảnh" : "Video";
    sections.push(`[${label} ${part.partIndex}]: ${summary}`);
  }

  return sections.join("\n\n");
}
