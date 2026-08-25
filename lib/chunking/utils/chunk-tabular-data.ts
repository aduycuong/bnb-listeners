import type { ChunkStrategy, DocumentChunk, DocumentChunkMetadata } from "../types";
import { chunkMarkdownByHeading } from "./chunk-markdown-by-heading";

function isMarkdownTableRow(line: string): boolean {
  return (line.match(/(?<!\\)\|/g)?.length ?? 0) >= 2;
}

function isMarkdownTableDivider(line: string): boolean {
  return (
    line.includes("|") &&
    /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)*\|?\s*$/.test(line)
  );
}

function getHeadingPathBeforeLine(lines: string[], endIndex: number): string[] {
  let headingPath: string[] = [];
  let fenceMarker: "`" | "~" | null = null;

  for (let i = 0; i < endIndex; i += 1) {
    const line = lines[i];
    const fenceMatch = line.match(/^\s*(`{3,}|~{3,})/);
    if (fenceMatch) {
      const marker = fenceMatch[1][0] as "`" | "~";
      fenceMarker = fenceMarker === marker ? null : fenceMarker ?? marker;
      continue;
    }
    if (fenceMarker) continue;

    const headingMatch = line.match(/^(#{1,6})[ \t]+(.+?)(?:[ \t]+#+)?[ \t]*$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const title = headingMatch[2].trim();
      const parentPath = headingPath.slice(0, Math.min(headingPath.length, level - 1));
      headingPath = [...parentPath, title];
    }
  }

  return headingPath;
}

function collectChunks(
  parts: Array<Omit<DocumentChunk, "index">>,
): DocumentChunk[] {
  return parts
    .filter((chunk) => chunk.text.trim())
    .map((chunk, index) => ({ ...chunk, index }));
}

/**
 * Splits documents that contain Markdown tables into batched row chunks,
 * with prose sections handled via heading-based splitting.
 *
 * Table rows are batched in groups of 20 (each batch includes the header row
 * so it remains self-contained). Prose between / around tables is delegated
 * to chunkMarkdownByHeading.
 *
 * Falls back to heading-based chunking when no tables are found.
 */
export function chunkTabularData(
  markdown: string,
  strategy: ChunkStrategy,
): DocumentChunk[] {
  const lines = markdown.split(/\r?\n/);
  const parts: Array<Omit<DocumentChunk, "index">> = [];
  const batchSize = 20;
  let foundTable = false;
  let proseStart = 0;
  let lineIndex = 0;
  let fenceMarker: "`" | "~" | null = null;

  function addProse(start: number, end: number) {
    const prose = lines.slice(start, end).join("\n").trim();
    if (!prose) return;
    for (const chunk of chunkMarkdownByHeading(prose, strategy)) {
      parts.push({ text: chunk.text, metadata: chunk.metadata });
    }
  }

  while (lineIndex < lines.length - 1) {
    const fenceMatch = lines[lineIndex].match(/^\s*(`{3,}|~{3,})/);
    if (fenceMatch) {
      const marker = fenceMatch[1][0] as "`" | "~";
      fenceMarker = fenceMarker === marker ? null : fenceMarker ?? marker;
      lineIndex += 1;
      continue;
    }

    if (
      fenceMarker ||
      !isMarkdownTableRow(lines[lineIndex]) ||
      !isMarkdownTableDivider(lines[lineIndex + 1])
    ) {
      lineIndex += 1;
      continue;
    }

    foundTable = true;
    addProse(proseStart, lineIndex);

    const header = lines[lineIndex].trim();
    const headingPath = getHeadingPathBeforeLine(lines, lineIndex);
    const sectionTitle = headingPath.at(-1) ?? "table";
    const rows: string[] = [];
    lineIndex += 2;

    while (lineIndex < lines.length && isMarkdownTableRow(lines[lineIndex])) {
      rows.push(lines[lineIndex].trim());
      lineIndex += 1;
    }

    for (let rowIndex = 0; rowIndex < rows.length; rowIndex += batchSize) {
      const metadata: DocumentChunkMetadata = {
        strategy,
        headingPath: headingPath.length ? headingPath : undefined,
        sectionTitle,
      };
      parts.push({
        text: [header, ...rows.slice(rowIndex, rowIndex + batchSize)].join("\n").trim(),
        metadata,
      });
    }

    proseStart = lineIndex;
  }

  if (!foundTable) {
    return chunkMarkdownByHeading(markdown, strategy);
  }

  addProse(proseStart, lines.length);
  return collectChunks(parts);
}
