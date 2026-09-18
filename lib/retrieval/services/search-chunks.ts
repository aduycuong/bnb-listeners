import { sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  CHUNK_EMBEDDING_DIMENSIONS,
  CHUNK_MULTIMODAL_EMBEDDING_DIMENSIONS,
} from "@/db/pgvector";

import {
  RETRIEVAL_CANDIDATE_LIMIT,
  RETRIEVAL_QUALITY_MIN,
  RETRIEVAL_RETURN_LIMIT,
  RRF_K,
} from "../config";
import type {
  RetrievedChunk,
  RetrievedChunkWithScores,
  SearchChunksParams,
} from "../types";
import { embedMultimodalQuery } from "../utils/embed-multimodal-query";
import { embedQuery } from "../utils/embed-query";
import { normalizeQueryForFts } from "../utils/normalize-query-for-fts";

type ChunkRow = {
  id: string;
  content: string;
  chunk_index: number;
  quality_score: number;
  term_ids: string[];
  document_id: string;
  title: string | null;
  doc_type: string;
  source_origin_name: string;
  published_at: Date | null;
  rrf_score: number | null;
  similarity_score: number | null;
  multimodal_similarity_score: number | null;
  fts_score: number | null;
  comment_count: number;
};

/**
 * Hybrid semantic + full-text search over workspace chunks using Reciprocal Rank Fusion.
 *
 * 1. Embed the query with OpenAI text-embedding-3-small and, when configured,
 *    Voyage voyage-multimodal-3.5 for media chunks.
 * 2. Run text vector search, multimodal vector search (when available), and
 *    full-text search in parallel via a single SQL CTE.
 * 3. Merge candidate lists with RRF, return top `limit` chunks.
 * 4. When `includeScores` is true, also recompute per-method debug scores
 *    (cosine similarity, multimodal similarity, ts_rank, RRF) for returned rows.
 */
export async function searchChunks(
  params: SearchChunksParams & { includeScores: true },
): Promise<RetrievedChunkWithScores[]>;
export async function searchChunks(
  params: SearchChunksParams,
): Promise<RetrievedChunk[]>;
export async function searchChunks(
  params: SearchChunksParams,
): Promise<RetrievedChunk[]> {
  const {
    workspaceId,
    query,
    limit = RETRIEVAL_RETURN_LIMIT,
    termIds,
    documentId,
    includeScores = false,
  } = params;

  const [embedding, multimodalEmbedding, normalizedQuery] = await Promise.all([
    embedQuery(query),
    embedMultimodalQuery(query),
    Promise.resolve(normalizeQueryForFts(query)),
  ]);

  const vectorLiteral = `[${embedding.join(",")}]`;
  const multimodalVectorLiteral = multimodalEmbedding
    ? `[${multimodalEmbedding.join(",")}]`
    : null;
  const returnLimit = Math.min(limit, RETRIEVAL_RETURN_LIMIT * 2);

  const termFilter =
    termIds && termIds.length > 0
      ? sql.raw(`AND c.term_ids && ARRAY[${termIds.map((id) => `'${id}'::uuid`).join(",")}]`)
      : sql.raw("");

  const documentFilter = documentId
    ? sql`AND d.id = ${documentId}::uuid`
    : sql.raw("");

  const multimodalVectorSearch = multimodalVectorLiteral
    ? sql`
        multimodal_vector_search AS (
          SELECT
            c.id,
            ROW_NUMBER() OVER (
              ORDER BY c.embedding_multimodal <=> ${sql.raw(`'${multimodalVectorLiteral}'::vector(${CHUNK_MULTIMODAL_EMBEDDING_DIMENSIONS})`)}
            ) AS rank
          FROM chunks c
          INNER JOIN documents d ON d.id = c.document_id
          WHERE d.workspace_id = ${workspaceId}::uuid
            AND c.quality_score >= ${RETRIEVAL_QUALITY_MIN}
            AND c.embedding_multimodal IS NOT NULL
            ${termFilter}
            ${documentFilter}
          ORDER BY c.embedding_multimodal <=> ${sql.raw(`'${multimodalVectorLiteral}'::vector(${CHUNK_MULTIMODAL_EMBEDDING_DIMENSIONS})`)}
          LIMIT ${RETRIEVAL_CANDIDATE_LIMIT}
        ),`
    : sql`
        multimodal_vector_search AS (
          SELECT NULL::uuid AS id, NULL::bigint AS rank
          WHERE false
        ),`;

  const scoreSelect = includeScores
    ? sql`
      r.rrf_score,
      1 - (c.embedding <=> ${sql.raw(`'${vectorLiteral}'::vector(${CHUNK_EMBEDDING_DIMENSIONS})`)}) AS similarity_score,
      ${
        multimodalVectorLiteral
          ? sql`CASE
              WHEN c.embedding_multimodal IS NOT NULL THEN
                1 - (c.embedding_multimodal <=> ${sql.raw(`'${multimodalVectorLiteral}'::vector(${CHUNK_MULTIMODAL_EMBEDDING_DIMENSIONS})`)})
              ELSE NULL
            END`
          : sql`NULL::float`
      } AS multimodal_similarity_score,
      CASE
        WHEN c.content_tsv @@ fq.query THEN ts_rank(c.content_tsv, fq.query)
        ELSE NULL
      END AS fts_score`
    : sql`
      NULL::float AS rrf_score,
      NULL::float AS similarity_score,
      NULL::float AS multimodal_similarity_score,
      NULL::float AS fts_score`;

  const ftsQueryJoin = includeScores
    ? sql`CROSS JOIN fts_query fq`
    : sql.raw("");

  const rows = await db.execute<ChunkRow>(sql`
    WITH fts_query AS (
      SELECT websearch_to_tsquery('simple', ${normalizedQuery}) AS query
    ),
    vector_search AS (
      SELECT
        c.id,
        ROW_NUMBER() OVER (ORDER BY c.embedding <=> ${sql.raw(`'${vectorLiteral}'::vector(${CHUNK_EMBEDDING_DIMENSIONS})`)}) AS rank
      FROM chunks c
      INNER JOIN documents d ON d.id = c.document_id
      WHERE d.workspace_id = ${workspaceId}::uuid
        AND c.quality_score >= ${RETRIEVAL_QUALITY_MIN}
        ${termFilter}
        ${documentFilter}
      ORDER BY c.embedding <=> ${sql.raw(`'${vectorLiteral}'::vector(${CHUNK_EMBEDDING_DIMENSIONS})`)}
      LIMIT ${RETRIEVAL_CANDIDATE_LIMIT}
    ),
    fts_search AS (
      SELECT
        c.id,
        ROW_NUMBER() OVER (ORDER BY ts_rank(c.content_tsv, fq.query) DESC) AS rank
      FROM chunks c
      INNER JOIN documents d ON d.id = c.document_id
      CROSS JOIN fts_query fq
      WHERE d.workspace_id = ${workspaceId}::uuid
        AND c.quality_score >= ${RETRIEVAL_QUALITY_MIN}
        AND c.content_tsv @@ fq.query
        ${termFilter}
        ${documentFilter}
      LIMIT ${RETRIEVAL_CANDIDATE_LIMIT}
    ),
    ${multimodalVectorSearch}
    candidate_ranks AS (
      SELECT id, rank FROM vector_search
      UNION ALL
      SELECT id, rank FROM fts_search
      UNION ALL
      SELECT id, rank FROM multimodal_vector_search
    ),
    rrf AS (
      SELECT
        id,
        SUM(1.0 / (${RRF_K}::float + rank::float)) AS rrf_score
      FROM candidate_ranks
      GROUP BY id
    )
    SELECT
      c.id,
      c.content,
      c.chunk_index,
      c.quality_score,
      c.term_ids,
      c.comment_count,
      d.id         AS document_id,
      d.title,
      d.doc_type,
      d.source_origin_name,
      d.published_at,
      ${scoreSelect}
    FROM rrf r
    JOIN chunks c ON c.id = r.id
    JOIN documents d ON d.id = c.document_id
    ${ftsQueryJoin}
    ORDER BY r.rrf_score DESC
    LIMIT ${returnLimit}
  `);

  return rows.rows.map((row) => {
    const chunk: RetrievedChunk = {
      id: row.id,
      content: row.content,
      chunkIndex: row.chunk_index,
      qualityScore: Number(row.quality_score),
      documentId: row.document_id,
      title: row.title ?? null,
      docType: row.doc_type,
      sourceOriginName: row.source_origin_name,
      publishedAt: row.published_at
        ? new Date(row.published_at).toISOString()
        : null,
      commentCount: Number(row.comment_count),
    };

    if (includeScores) {
      chunk.rrfScore = Number(row.rrf_score);
      chunk.similarityScore = Number(row.similarity_score);
      chunk.multimodalSimilarityScore =
        row.multimodal_similarity_score === null
          ? null
          : Number(row.multimodal_similarity_score);
      chunk.ftsScore = row.fts_score === null ? null : Number(row.fts_score);
    }

    return chunk;
  });
}
