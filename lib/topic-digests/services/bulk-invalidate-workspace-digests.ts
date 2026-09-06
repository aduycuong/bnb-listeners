import { sql } from "drizzle-orm";

import { db } from "@/lib/db";

// ---------------------------------------------------------------------------
// Shared helper
// ---------------------------------------------------------------------------

function buildBulkInvalidateSql(whereClause: ReturnType<typeof sql>) {
  return sql`
    UPDATE topic_digest_daily
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
// Targeted: known affected topic IDs
// ---------------------------------------------------------------------------

export type BulkInvalidateTopicDigestsParams = {
  /**
   * Explicit list of topic IDs whose digest rows should be marked bulk-stale.
   * Use this for topic merge/split operations where you know exactly which
   * topics are involved.
   */
  topicIds: string[];
};

/**
 * Mark daily digest rows for a specific set of topics as bulk-stale.
 *
 * Prefer this over bulkInvalidateWorkspaceDigests when you know which topics
 * are affected (e.g. topic merge A+B→C, split A→B+C). Only the rows for the
 * given topic IDs are touched — unrelated topics in the same workspace are
 * not invalidated unnecessarily.
 */
export async function bulkInvalidateTopicDigests(
  params: BulkInvalidateTopicDigestsParams,
): Promise<void> {
  const { topicIds } = params;
  if (topicIds.length === 0) return;

  await db.execute(
    buildBulkInvalidateSql(
      sql`topic_id = ANY(ARRAY[${sql.join(topicIds.map((id) => sql`${id}::uuid`), sql`, `)}])`,
    ),
  );
}

// ---------------------------------------------------------------------------
// Fallback: full workspace (when affected topics are unknown)
// ---------------------------------------------------------------------------

export type BulkInvalidateWorkspaceDigestsParams = {
  workspaceId: string;
};

/**
 * Mark ALL daily digest rows for a workspace as bulk-stale.
 *
 * Use this only when the set of affected topics is unknown (e.g. a full
 * taxonomy reset or external data import). For topic merge/split operations
 * prefer bulkInvalidateTopicDigests, which is more targeted and avoids
 * queuing unaffected topics in the bulk-drain job.
 */
export async function bulkInvalidateWorkspaceDigests(
  params: BulkInvalidateWorkspaceDigestsParams,
): Promise<void> {
  const { workspaceId } = params;

  await db.execute(
    buildBulkInvalidateSql(
      sql`topic_id IN (SELECT id FROM topics WHERE workspace_id = ${workspaceId}::uuid)`,
    ),
  );
}
