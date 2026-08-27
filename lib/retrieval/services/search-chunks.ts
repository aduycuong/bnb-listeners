import { sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { CHUNK_EMBEDDING_DIMENSIONS } from "@/db/pgvector";

import {
  RETRIEVAL_CANDIDATE_LIMIT,
  RETRIEVAL_QUALITY_MIN,
  RETRIEVAL_RETURN_LIMIT,
  RRF_K,
} from "../config";
import type { RetrievedChunk, SearchChunksParams } from "../types";
import { embedQuery } from "../utils/embed-query";
import { normalizeQueryForFts } from "../utils/normalize-query-for-fts";

type ChunkRow = {
  id: string;
  content: string;
  chunk_index: number;
  quality_score: number;
  topic_ids: string[];
  document_id: string;
  title: string | null;
  doc_type: string;
  source_name: string;
  published_at: Date | null;
  rrf_score: number;
};

/**
 * Hybrid semantic + full-text search over workspace chunks using Reciprocal Rank Fusion.
 *
 * 1. Embed the query with OpenAI text-embedding-3-small.
 * 2. Run vector search (HNSW cosine) and full-text search in parallel via a single SQL CTE.
 * 3. Merge candidate lists with RRF, return top `limit` chunks.
 */
export async function searchChunks(params: SearchChunksParams): Promise<RetrievedChunk[]> {
  const { workspaceId, query, limit = RETRIEVAL_RETURN_LIMIT, topicIds } = params;

  const [embedding, normalizedQuery] = await Promise.all([
    embedQuery(query),
    Promise.resolve(normalizeQueryForFts(query)),
  ]);

  const vectorLiteral = `[${embedding.join(",")}]`;
  const returnLimit = Math.min(limit, RETRIEVAL_RETURN_LIMIT * 2);

  const topicFilter =
    topicIds && topicIds.length > 0
      ? sql.raw(`AND c.topic_ids && ARRAY[${topicIds.map((id) => `'${id}'::uuid`).join(",")}]`)
      : sql.raw("");

  const rows = await db.execute<ChunkRow>(sql`
    WITH vector_search AS (
      SELECT
        c.id,
        ROW_NUMBER() OVER (ORDER BY c.embedding <=> ${sql.raw(`'${vectorLiteral}'::vector(${CHUNK_EMBEDDING_DIMENSIONS})`)}) AS rank
      FROM chunks c
      INNER JOIN documents d ON d.id = c.document_id
      WHERE d.workspace_id = ${workspaceId}::uuid
        AND d.is_duplicate = false
        AND c.quality_score >= ${RETRIEVAL_QUALITY_MIN}
        ${topicFilter}
      ORDER BY c.embedding <=> ${sql.raw(`'${vectorLiteral}'::vector(${CHUNK_EMBEDDING_DIMENSIONS})`)}
      LIMIT ${RETRIEVAL_CANDIDATE_LIMIT}
    ),
    fts_search AS (
      SELECT
        c.id,
        ROW_NUMBER() OVER (ORDER BY ts_rank(c.content_tsv, query) DESC) AS rank
      FROM chunks c
      INNER JOIN documents d ON d.id = c.document_id,
      websearch_to_tsquery('simple', ${normalizedQuery}) query
      WHERE d.workspace_id = ${workspaceId}::uuid
        AND d.is_duplicate = false
        AND c.quality_score >= ${RETRIEVAL_QUALITY_MIN}
        AND c.content_tsv @@ query
        ${topicFilter}
      LIMIT ${RETRIEVAL_CANDIDATE_LIMIT}
    ),
    rrf AS (
      SELECT
        COALESCE(v.id, f.id) AS id,
        COALESCE(1.0 / (${RRF_K}::float + v.rank::float), 0.0) +
        COALESCE(1.0 / (${RRF_K}::float + f.rank::float), 0.0) AS rrf_score
      FROM vector_search v
      FULL OUTER JOIN fts_search f ON v.id = f.id
    )
    SELECT
      c.id,
      c.content,
      c.chunk_index,
      c.quality_score,
      c.topic_ids,
      d.id         AS document_id,
      d.title,
      d.doc_type,
      d.source_name,
      d.published_at,
      r.rrf_score
    FROM rrf r
    JOIN chunks c ON c.id = r.id
    JOIN documents d ON d.id = c.document_id
    ORDER BY r.rrf_score DESC
    LIMIT ${returnLimit}
  `);

  return rows.rows.map((row) => ({
    id: row.id,
    content: row.content,
    chunkIndex: row.chunk_index,
    qualityScore: Number(row.quality_score),
    documentId: row.document_id,
    title: row.title ?? null,
    docType: row.doc_type,
    sourceName: row.source_name,
    publishedAt: row.published_at ? new Date(row.published_at).toISOString() : null,
    rrfScore: Number(row.rrf_score),
  }));
}
