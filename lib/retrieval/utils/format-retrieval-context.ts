import type { RetrievedChunk } from "../types";

/**
 * Formats retrieved chunks into a context string suitable for an LLM prompt.
 * Each chunk is prefixed with an index and source metadata.
 */
export function formatRetrievalContext(chunks: RetrievedChunk[]): string {
  return chunks
    .map((chunk, i) => {
      const parts: string[] = [];

      if (chunk.title) parts.push(chunk.title);
      else parts.push(chunk.sourceName);

      parts.push(chunk.docType);

      if (chunk.publishedAt) {
        parts.push(new Date(chunk.publishedAt).toLocaleDateString("en-US", { dateStyle: "medium" }));
      }

      const meta = parts.join(" · ");
      return `[${i + 1}] ${meta}\n${chunk.content}`;
    })
    .join("\n\n---\n\n");
}

export type SourceItem = {
  index: number;
  documentId: string;
  title: string;
  docType: string;
  publishedAt: string | null;
};

/**
 * Deduplicates by document and returns a list of unique sources
 * for citation in the response.
 */
export function formatSources(chunks: RetrievedChunk[]): SourceItem[] {
  const seen = new Set<string>();
  const sources: SourceItem[] = [];

  for (const chunk of chunks) {
    if (seen.has(chunk.documentId)) continue;
    seen.add(chunk.documentId);

    sources.push({
      index: sources.length + 1,
      documentId: chunk.documentId,
      title: chunk.title ?? chunk.sourceName,
      docType: chunk.docType,
      publishedAt: chunk.publishedAt,
    });
  }

  return sources;
}
