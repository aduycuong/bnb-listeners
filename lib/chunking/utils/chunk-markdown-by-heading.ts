import type { ChunkStrategy, DocumentChunk, DocumentChunkMetadata } from "../types";

type MarkdownHeading = {
  level: number;
  title: string;
};

function parseAtxHeading(line: string): MarkdownHeading | null {
  const match = line.match(/^(#{1,6})[ \t]+(.+?)(?:[ \t]+#+)?[ \t]*$/);
  if (!match) return null;
  return { level: match[1].length, title: match[2].trim() };
}

function normalizeHeadingPath(path: string[], heading: MarkdownHeading): string[] {
  const parentPath = path.slice(0, Math.min(path.length, heading.level - 1));
  return [...parentPath, heading.title];
}

/**
 * Returns true when the markdown string contains at least one ATX heading
 * outside a fenced code block. Useful to decide whether heading-based
 * chunking will produce multiple sections.
 */
export function looksLikeMarkdownHeadings(markdown: string): boolean {
  let fenceMarker: "`" | "~" | null = null;

  for (const line of markdown.split(/\r?\n/)) {
    const fenceMatch = line.match(/^\s*(`{3,}|~{3,})/);
    if (fenceMatch) {
      const marker = fenceMatch[1][0] as "`" | "~";
      fenceMarker = fenceMarker === marker ? null : fenceMarker ?? marker;
      continue;
    }
    if (!fenceMarker && parseAtxHeading(line)) return true;
  }

  return false;
}

/**
 * Splits markdown into logical chunks at heading boundaries.
 * Each chunk contains a heading and all content that follows it until the
 * next same-or-higher-level heading. The heading path is tracked so that
 * split-for-retrieval can prepend context prefixes.
 *
 * Falls back gracefully: if the content has no headings the entire text
 * becomes a single logical chunk.
 */
export function chunkMarkdownByHeading(
  markdown: string,
  strategy: ChunkStrategy,
): DocumentChunk[] {
  const lines = markdown.split(/\r?\n/);
  const result: DocumentChunk[] = [];
  const headingPath: string[] = [];
  let buffer: string[] = [];
  let sectionTitle: string | undefined;
  let fenceMarker: "`" | "~" | null = null;

  function flush() {
    const text = buffer.join("\n").trim();
    if (!text || (!text.includes("\n") && parseAtxHeading(text))) {
      buffer = [];
      return;
    }

    const metadata: DocumentChunkMetadata = {
      strategy,
      headingPath: headingPath.length ? [...headingPath] : undefined,
      sectionTitle,
    };

    result.push({ index: result.length, text, metadata });
    buffer = [];
  }

  for (const line of lines) {
    const fenceMatch = line.match(/^\s*(`{3,}|~{3,})/);
    if (fenceMatch) {
      const marker = fenceMatch[1][0] as "`" | "~";
      fenceMarker = fenceMarker === marker ? null : fenceMarker ?? marker;
      buffer.push(line);
      continue;
    }

    const heading = fenceMarker ? null : parseAtxHeading(line);
    if (heading) {
      flush();
      headingPath.splice(
        0,
        headingPath.length,
        ...normalizeHeadingPath(headingPath, heading),
      );
      sectionTitle = heading.title;
      buffer.push(line);
      continue;
    }

    buffer.push(line);
  }

  flush();
  return result;
}
