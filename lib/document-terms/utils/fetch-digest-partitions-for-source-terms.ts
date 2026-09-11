import { sql } from "drizzle-orm";

import { db } from "@/lib/db";

import type { DigestPartition } from "../types";

type PartitionRow = {
  date_key: string;
  job_id: string;
};

/**
 * Distinct (published_at date, job_id) pairs for documents assigned to any
 * of the given source terms. Used to invalidate digest rows on the target.
 */
export async function fetchDigestPartitionsForSourceTerms(
  sourceTermIds: string[],
): Promise<DigestPartition[]> {
  if (sourceTermIds.length === 0) {
    return [];
  }

  const result = await db.execute<PartitionRow>(sql`
    SELECT DISTINCT
      d.published_at::date AS date_key,
      d.job_id
    FROM document_terms dt
    INNER JOIN documents d ON d.id = dt.document_id
    WHERE dt.term_id = ANY(ARRAY[${sql.join(
      sourceTermIds.map((id) => sql`${id}::uuid`),
      sql`, `,
    )}])
      AND d.published_at IS NOT NULL
  `);

  return result.rows.map((row) => ({
    dateKey: row.date_key,
    jobId: row.job_id,
  }));
}
