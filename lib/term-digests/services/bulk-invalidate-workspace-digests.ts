import { sql } from "drizzle-orm";

import { db } from "@/lib/db";

// ---------------------------------------------------------------------------
// Shared helper
// ---------------------------------------------------------------------------

function buildBulkInvalidateSql(whereClause: ReturnType<typeof sql>) {
  return sql`
    UPDATE term_digest_daily
    SET
      is_stale             = true,
      is_bulk_stale        = true,
      stale_since          = CASE
                               WHEN processing THEN now()
                               ELSE COALESCE(stale_since, now())
                             END
    WHERE ${whereClause}
  `;
}

// ---------------------------------------------------------------------------
// Targeted: known affected term IDs
// ---------------------------------------------------------------------------

export type BulkInvalidateTermDigestsParams = {
  /**
   * Explicit list of term IDs whose digest rows should be marked bulk-stale.
   * Use this for term merge/split operations where you know exactly which
   * terms are involved.
   */
  termIds: string[];
};

/**
 * Mark daily digest rows for a specific set of terms as bulk-stale.
 *
 * Prefer this over bulkInvalidateWorkspaceDigests when you know which terms
 * are affected (e.g. term merge A+B→C, split A→B+C). Only the rows for the
 * given term IDs are touched — unrelated terms in the same workspace are
 * not invalidated unnecessarily.
 */
export async function bulkInvalidateTermDigests(
  params: BulkInvalidateTermDigestsParams,
): Promise<void> {
  const { termIds } = params;
  if (termIds.length === 0) return;

  await db.execute(
    buildBulkInvalidateSql(
      sql`term_id = ANY(ARRAY[${sql.join(termIds.map((id) => sql`${id}::uuid`), sql`, `)}])`,
    ),
  );
}

// ---------------------------------------------------------------------------
// Fallback: full workspace (when affected terms are unknown)
// ---------------------------------------------------------------------------

export type BulkInvalidateWorkspaceDigestsParams = {
  workspaceId: string;
};

/**
 * Mark ALL daily digest rows for a workspace as bulk-stale.
 *
 * Use this only when the set of affected terms is unknown (e.g. a full
 * taxonomy reset or external data import). For term merge/split operations
 * prefer bulkInvalidateTermDigests, which is more targeted and avoids
 * queuing unaffected terms in the bulk-drain job.
 */
export async function bulkInvalidateWorkspaceDigests(
  params: BulkInvalidateWorkspaceDigestsParams,
): Promise<void> {
  const { workspaceId } = params;

  await db.execute(
    buildBulkInvalidateSql(
      sql`term_id IN (SELECT id FROM terms WHERE workspace_id = ${workspaceId}::uuid)`,
    ),
  );
}
