import { sql } from "drizzle-orm";

import { CHUNK_EMBEDDING_DIMENSIONS } from "@/db/pgvector";
import { db } from "@/lib/db";

import {
  TERM_CANDIDATES_PER_PROPOSAL,
  TERM_CANDIDATE_MIN_SIMILARITY,
} from "../config";
import type { ClassifierTerm } from "../types";

export type TermCandidate = {
  term: ClassifierTerm;
  /** Cosine similarity in [0, 1] between the proposal and this term. */
  similarity: number;
};

type CandidateRow = {
  id: string;
  name: string;
  description: string | null;
  similarity: number;
};

async function findCandidatesForVector(
  workspaceId: string,
  vector: number[],
): Promise<TermCandidate[]> {
  const vectorLiteral = sql.raw(
    `'[${vector.join(",")}]'::vector(${CHUNK_EMBEDDING_DIMENSIONS})`,
  );

  const result = await db.execute<CandidateRow>(sql`
    SELECT id, name, description, similarity
    FROM (
      SELECT
        t.id,
        t.name,
        t.description,
        1 - (t.embedding <=> ${vectorLiteral}) AS similarity
      FROM terms t
      WHERE t.workspace_id = ${workspaceId}::uuid
        AND t.embedding IS NOT NULL
      ORDER BY t.embedding <=> ${vectorLiteral}
      LIMIT ${TERM_CANDIDATES_PER_PROPOSAL}
    ) nearest
    WHERE similarity >= ${TERM_CANDIDATE_MIN_SIMILARITY}
    ORDER BY similarity DESC
  `);

  return result.rows.map((row) => ({
    term: { id: row.id, name: row.name, description: row.description },
    similarity: Number(row.similarity),
  }));
}

/**
 * For each proposal embedding, returns the nearest existing terms in the
 * workspace above the similarity floor, best match first. Result is
 * positionally aligned with `vectors`; terms without an embedding are skipped.
 */
export async function findCandidateTermsByEmbeddings(
  workspaceId: string,
  vectors: number[][],
): Promise<TermCandidate[][]> {
  return Promise.all(
    vectors.map((vector) => findCandidatesForVector(workspaceId, vector)),
  );
}
