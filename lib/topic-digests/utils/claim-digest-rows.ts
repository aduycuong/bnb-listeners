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
 * - Normal recompute job: bulkOnly = false → picks rows where is_bulk_stale = false
 * - Bulk drain job:       bulkOnly = true  → picks rows where is_bulk_stale = true
 *
 * Returns the list of (topicId, dateKey) pairs that were claimed.
 */
export async function claimDigestRows(
  params: ClaimDigestRowsParams,
): Promise<ClaimedRow[]> {
  const { batchSize, bulkOnly } = params;

  const bulkFilter = bulkOnly
    ? sql`AND is_bulk_stale = true`
    : sql`AND is_bulk_stale = false`;

  const rows = await db.execute<{ topic_id: string; date_key: string }>(sql`
    UPDATE topic_digest_daily
    SET processing = true, processing_started_at = now()
    WHERE (topic_id, date_key) IN (
      SELECT topic_id, date_key
      FROM topic_digest_daily
      WHERE is_stale = true
        AND processing = false
        AND recompute_after <= now()
        ${bulkFilter}
      LIMIT ${batchSize}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING topic_id, date_key
  `);

  return rows.rows.map((r) => ({
    topicId: r.topic_id,
    dateKey: r.date_key,
  }));
}
