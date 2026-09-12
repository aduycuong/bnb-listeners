import { sql } from "drizzle-orm";

import { termGroupMembers, terms } from "@/db/schema";
import { db } from "@/lib/db";
import { normalizeTermSearchQuery } from "@/lib/terms/utils/build-term-search-fts-sql";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import type {
  ListTermGroupMembersParams,
  ListTermGroupMembersResult,
} from "../types";
import { assertTermGroupInWorkspace } from "../utils/assert-term-group-in-workspace";

export async function listTermGroupMembers(
  params: ListTermGroupMembersParams,
  ctx: WorkspaceContext,
): Promise<ListTermGroupMembersResult> {
  await assertTermGroupInWorkspace(params.id, ctx.workspaceId);

  const normalizedSearch = normalizeTermSearchQuery(params.search);
  const searchFilter = normalizedSearch
    ? sql`AND ${terms.searchTsv} @@ websearch_to_tsquery('simple', ${normalizedSearch})`
    : sql``;

  const result = await db.execute<{
    id: string;
    name: string;
    description: string | null;
    assigned_by: string;
    assigned_at: Date | string;
  }>(sql`
    SELECT
      t.id,
      t.name,
      t.description,
      tgm.assigned_by,
      tgm.assigned_at
    FROM term_group_members tgm
    INNER JOIN terms t ON t.id = tgm.term_id
    WHERE tgm.term_group_id = ${params.id}::uuid
      AND t.workspace_id = ${ctx.workspaceId}::uuid
      ${searchFilter}
    ORDER BY t.name ASC
  `);

  return {
    items: result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      assignedBy: row.assigned_by,
      assignedAt:
        row.assigned_at instanceof Date
          ? row.assigned_at.toISOString()
          : new Date(row.assigned_at).toISOString(),
    })),
  };
}
