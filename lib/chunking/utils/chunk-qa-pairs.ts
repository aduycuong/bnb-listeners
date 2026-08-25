import type { ChunkStrategy, DocumentChunk } from "../types";
import { chunkMarkdownByHeading } from "./chunk-markdown-by-heading";

/**
 * Splits FAQ / Q&A documents at question markers (English and Vietnamese).
 *
 * Recognised question prefixes (case-insensitive):
 *   q:, question:, q1:, faq1:, câu hỏi:, câu 1:
 *
 * Falls back to heading-based chunking when fewer than two Q&A pairs are found.
 */
export function chunkQaPairs(
  markdown: string,
  strategy: ChunkStrategy,
): DocumentChunk[] {
  const pattern =
    /(?=^(?:[-*]\s*)?(?:\*\*)?(?:(?:q|question)\s*\d*|câu\s+hỏi\s*\d*|câu\s+\d+|faq\s*\d+)(?:\*\*)?\s*[:.)-]?\s*.+$)/gim;
  const parts = markdown
    .split(pattern)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length <= 1) {
    return chunkMarkdownByHeading(markdown, strategy);
  }

  return parts.map((text, index) => {
    const question = text.split(/\r?\n/, 1)[0].replace(/\*\*/g, "").trim();
    return {
      index,
      text,
      metadata: { strategy, sectionTitle: question },
    };
  });
}
