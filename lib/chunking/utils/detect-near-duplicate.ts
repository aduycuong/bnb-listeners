import { sql, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { CHUNK_EMBEDDING_DIMENSIONS } from "@/db/pgvector";
import { documents } from "@/db/schema";

import {
  NEAR_DUPLICATE_MIN_MATCHES,
  NEAR_DUPLICATE_THRESHOLD,
} from "../config";
import type { NearDuplicateResult } from "../types";

type CandidateRow = {
  document_id: string;
  avg_similarity: number;
  match_count: number;
  /** COALESCE(published_at, created_at) from the candidate's chunks. */
  candidate_effective_at: Date;
};

export type DetectNearDuplicateParams = {
  /** The document being evaluated — excluded from the candidate search. */
  documentId: string;
  /** In-memory chunk embeddings (up to 10 used). */
  embeddings: number[][];
  /**
   * When the content was published by the source. Used for canonical ordering
   * (earlier-published document wins). Falls back to createdAt when null.
   */
  publishedAt: Date | null;
  /** DB insertion time — fallback when publishedAt is null. */
  createdAt: Date;
};

/**
 * Detects near-duplicate documents using in-memory chunk embeddings.
 *
 * The embeddings are passed directly as vector literals in the SQL VALUES
 * clause, so this can run before chunks are written to the database.
 *
 * Algorithm (same as before, now pre-write):
 *   1. Build a VALUES clause from up to 10 in-memory embedding vectors.
 *   2. For each vector, find the nearest chunk from any OTHER document (HNSW).
 *   3. Group by candidate document_id, average the similarities.
 *   4. If the best candidate has avg similarity >= NEAR_DUPLICATE_THRESHOLD
 *      AND at least NEAR_DUPLICATE_MIN_MATCHES chunk pairs matched,
 *      the document is considered a near-duplicate.
 *   5. The canonical document is the earlier-published one (publishedAt, falling back to createdAt).
 *
 * Returns early with hasMatch=false when no embeddings are provided.
 */
export async function detectNearDuplicate(
  params: DetectNearDuplicateParams,
): Promise<NearDuplicateResult> {
  const { documentId, embeddings, publishedAt, createdAt } = params;

  const sampleEmbeddings = embeddings.slice(0, 10);
  if (sampleEmbeddings.length === 0) {
    return { hasMatch: false, canonicalId: null, duplicateId: null, similarity: null };
  }

  const [docRow] = await db
    .select({ workspaceId: documents.workspaceId })
    .from(documents)
    .where(eq(documents.id, documentId))
    .limit(1);

  if (!docRow) {
    return { hasMatch: false, canonicalId: null, duplicateId: null, similarity: null };
  }

  const workspaceId = docRow.workspaceId;

  // Build VALUES rows as inline vector literals — safe since values are number[].
  const valuesClause = sampleEmbeddings
    .map((vec) => `('[${vec.join(",")}]'::vector(${CHUNK_EMBEDDING_DIMENSIONS}))`)
    .join(", ");

  const rows = await db.execute<CandidateRow>(sql`
    WITH doc_embeddings (vec) AS (
      VALUES ${sql.raw(valuesClause)}
    ),
    nearest AS (
      SELECT
        de.vec                                                          AS source_vec,
        neighbor.document_id                                            AS document_id,
        COALESCE(neighbor.published_at, neighbor.created_at)           AS candidate_effective_at,
        1 - (de.vec <=> neighbor.embedding)                            AS similarity
      FROM doc_embeddings de
      CROSS JOIN LATERAL (
        SELECT c.document_id, c.embedding, c.published_at, c.created_at
        FROM   chunks c
        INNER JOIN documents d ON d.id = c.document_id
        WHERE  c.document_id != ${documentId}
          AND  d.workspace_id = ${workspaceId}
        ORDER  BY de.vec <=> c.embedding
        LIMIT  1
      ) neighbor
    )
    SELECT
      document_id,
      AVG(similarity)::float         AS avg_similarity,
      COUNT(*)::int                  AS match_count,
      MIN(candidate_effective_at)    AS candidate_effective_at
    FROM nearest
    GROUP BY document_id
    ORDER BY avg_similarity DESC
    LIMIT 1
  `);

  const best = rows.rows[0] as CandidateRow | undefined;

  if (!best) {
    return { hasMatch: false, canonicalId: null, duplicateId: null, similarity: null };
  }

  const avgSim = Number(best.avg_similarity);
  const matchCount = Number(best.match_count);
  const minMatches = Math.min(NEAR_DUPLICATE_MIN_MATCHES, sampleEmbeddings.length);
  const isAboveThreshold =
    avgSim >= NEAR_DUPLICATE_THRESHOLD &&
    matchCount >= minMatches;

  if (!isAboveThreshold) {
    return { hasMatch: false, canonicalId: null, duplicateId: null, similarity: avgSim };
  }

  const candidateEffectiveAt = new Date(best.candidate_effective_at);

  // Older-published document is canonical; newer is the duplicate.
  // Uses publishedAt (source publish date) when available, falls back to createdAt (DB insertion).
  // Tie-break: when timestamps are equal the candidate is treated as canonical.
  const effectiveDate = publishedAt ?? createdAt;
  const currentIsNewer = candidateEffectiveAt <= effectiveDate;

  return {
    hasMatch: true,
    canonicalId: currentIsNewer ? best.document_id : documentId,
    duplicateId: currentIsNewer ? documentId : best.document_id,
    similarity: avgSim,
  };
}
