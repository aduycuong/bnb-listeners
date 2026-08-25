import type { ChunkStrategy, DocumentChunk } from "../types";
import { chunkMarkdownByHeading } from "./chunk-markdown-by-heading";

/**
 * Splits slide-deck content (e.g. exported PPTX/Google Slides markdown) at
 * H1/H2 heading boundaries, treating each slide as one logical chunk.
 *
 * Falls back to heading-based chunking when fewer than two slide boundaries
 * are detected.
 */
export function chunkSlideBySlide(
  markdown: string,
  strategy: ChunkStrategy,
): DocumentChunk[] {
  const parts = markdown
    .split(/\n(?=^#{1,2}[ \t]+)/m)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length <= 1) {
    return chunkMarkdownByHeading(markdown, strategy);
  }

  return parts.map((text, index) => {
    const titleMatch = text.match(/^#{1,2}[ \t]+(.+?)(?:[ \t]+#+)?[ \t]*$/m);
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
