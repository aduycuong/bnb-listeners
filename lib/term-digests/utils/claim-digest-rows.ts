import { sql } from "drizzle-orm";

import { db } from "@/lib/db";
import type { ClaimedRow } from "../types";

export type ClaimDigestRowsParams = {
  batchSize: number;
  /** When true, claims rows flagged by bulk taxonomy ops (is_bulk_stale = true). */
  bulkOnly: boolean;
};

/**
 * Atomically claim a batch of stale daily rows using FOR UPDATE SKIP LOCKED
 * so concurrent workers never process the same row twice.
 *
 * Rows are ordered by stale_since ASC (oldest stale episode first).
 *
 * - Normal recompute job: bulkOnly = false → picks rows where is_bulk_stale = false
 * - Bulk drain job:       bulkOnly = true  → picks rows where is_bulk_stale = true
 *
 * Returns the list of (termId, dateKey, jobId) triples that were claimed.
 */
export async function claimDigestRows(
  params: ClaimDigestRowsParams,
): Promise<ClaimedRow[]> {
  const { batchSize, bulkOnly } = params;

  const bulkFilter = bulkOnly
    ? sql`AND is_bulk_stale = true`
    : sql`AND is_bulk_stale = false`;

  const rows = await db.execute<{
    term_id: string;
    date_key: string;
    job_id: string;
  }>(sql`
    UPDATE term_digest_daily
    SET processing = true, processing_started_at = now()
    WHERE (term_id, date_key, job_id) IN (
      SELECT term_id, date_key, job_id
      FROM term_digest_daily
      WHERE is_stale = true
        AND processing = false
        ${bulkFilter}
      ORDER BY stale_since ASC NULLS FIRST
      LIMIT ${batchSize}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING term_id, date_key, job_id
  `);

  return rows.rows.map((r) => ({
    termId: r.term_id,
    dateKey: r.date_key,
    jobId: r.job_id,
  }));
}
