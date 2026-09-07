import { sql } from "drizzle-orm";

import { db } from "@/lib/db";

import type { DigestPartition } from "../types";

type PartitionRow = {
  date_key: string;
  job_id: string;
};

/**
 * Distinct (published_at date, job_id) pairs for documents assigned to any
 * of the given source topics. Used to invalidate digest rows on the target.
 */
export async function fetchDigestPartitionsForSourceTopics(
  sourceTopicIds: string[],
): Promise<DigestPartition[]> {
  if (sourceTopicIds.length === 0) {
    return [];
  }

  const result = await db.execute<PartitionRow>(sql`
    SELECT DISTINCT
      d.published_at::date AS date_key,
      d.job_id
    FROM document_topics dt
    INNER JOIN documents d ON d.id = dt.document_id
    WHERE dt.topic_id = ANY(ARRAY[${sql.join(
      sourceTopicIds.map((id) => sql`${id}::uuid`),
      sql`, `,
    )}])
      AND d.published_at IS NOT NULL
  `);

  return result.rows.map((row) => ({
    dateKey: row.date_key,
    jobId: row.job_id,
  }));
}
