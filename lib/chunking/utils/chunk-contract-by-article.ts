import type { ChunkStrategy, DocumentChunk } from "../types";
import { chunkMarkdownByHeading } from "./chunk-markdown-by-heading";

/**
 * Splits legal/contract content on Vietnamese and English article/clause markers:
 * Điều, Khoản, Mục, Article, Section — including ordinal prefixes ("thứ").
 *
 * Falls back to heading-based chunking when no article markers are found.
 */
export function chunkContractByArticle(
  markdown: string,
  strategy: ChunkStrategy,
): DocumentChunk[] {
  const marker =
    "(?:Điều|Khoản|Mục|Article|Section)\\s+(?:(?:thứ)\\s+)?(?:\\d+(?:\\.\\d+)*|[IVXLCDM]+|[A-Z])\\b";
  const pattern = new RegExp(`(?=^(?:#{1,6}\\s+)?${marker}.*$)`, "gim");
  const parts = markdown
    .split(pattern)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length <= 1) {
    return chunkMarkdownByHeading(markdown, strategy);
  }

  return parts.map((text, index) => {
    const titleMatch = text.match(
      new RegExp(`^(?:#{1,6}\\s+)?(${marker}[^\\n]*)`, "im"),
    );

    return {
      index,
      text,
      metadata: {
        strategy,
        sectionTitle: titleMatch?.[1]?.trim(),
      },
    };
  });
}
