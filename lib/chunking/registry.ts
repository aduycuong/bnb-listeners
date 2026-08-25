import type { ChunkStrategy } from "./types";

/**
 * Maps doc_type values to the most appropriate chunk strategy.
 *
 * Rationale:
 *   legal   — structured by articles/clauses → split on article markers
 *   guide   — markdown with headings → split by heading sections
 *   news    — usually markdown with headings → split by heading sections
 *   post    — social/forum freeform prose → split recursively by character budget
 *   review  — freeform prose → split recursively by character budget
 *   comment — short freeform text → split recursively by character budget
 *
 * Unknown doc_types fall back to chunk_markdown_by_heading, which degrades
 * gracefully to a single logical chunk when the content has no headings.
 */
const DOC_TYPE_STRATEGY: Partial<Record<string, ChunkStrategy>> = {
  legal: "chunk_contract_by_article",
  guide: "chunk_markdown_by_heading",
  news: "chunk_markdown_by_heading",
  post: "chunk_recursive_by_token",
  review: "chunk_recursive_by_token",
  comment: "chunk_recursive_by_token",
};

const DEFAULT_STRATEGY: ChunkStrategy = "chunk_markdown_by_heading";

export function getChunkStrategy(docType: string): ChunkStrategy {
  return DOC_TYPE_STRATEGY[docType] ?? DEFAULT_STRATEGY;
}
