import { sql } from "drizzle-orm";

import { db } from "@/lib/db";

import type { DigestPartition } from "../types";

type PartitionRow = {
  date_key: string;
  job_id: string;
};

/**
 * Distinct (published_at date, job_id) pairs for the given documents.
 */
export async function fetchDigestPartitionsForDocuments(
  documentIds: string[],
): Promise<DigestPartition[]> {
  if (documentIds.length === 0) {
    return [];
  }

  const result = await db.execute<PartitionRow>(sql`
    SELECT DISTINCT
      d.published_at::date AS date_key,
      d.job_id
    FROM documents d
    WHERE d.id = ANY(ARRAY[${sql.join(
      documentIds.map((id) => sql`${id}::uuid`),
      sql`, `,
    )}])
      AND d.published_at IS NOT NULL
  `);

  return result.rows.map((row) => ({
    dateKey: row.date_key,
    jobId: row.job_id,
  }));
}
