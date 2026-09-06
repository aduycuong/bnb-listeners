import { asc, eq } from "drizzle-orm";

import { sourceGroups } from "@/db/schema";
import { db } from "@/lib/db";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import type { ListSourceGroupsParams, ListSourceGroupsResult } from "../types";
import { getUnassignedGroupId } from "../utils/get-unassigned-group-id";
import { toSourceGroupListItem } from "../utils/to-source-group-list-item";

/**
 * List source groups for a workspace.
 *
 * Normal (non-unassigned) groups are returned first, sorted alphabetically.
 * The auto-created "Unassigned" group — identified by its deterministic UUID —
 * is appended at the end when it exists, so filter dropdowns can show it, but
 * management UIs can use the `isUnassigned` flag to exclude it from
 * edit/delete flows.
 */
export async function listSourceGroups(
  _params: ListSourceGroupsParams = {},
  ctx: WorkspaceContext,
): Promise<ListSourceGroupsResult> {
  const unassignedId = getUnassignedGroupId(ctx.workspaceId);

  const rows = await db
    .select()
    .from(sourceGroups)
    .where(eq(sourceGroups.workspaceId, ctx.workspaceId))
    .orderBy(asc(sourceGroups.name));

  // Sort: non-unassigned first (alpha), unassigned last
  const sorted = [
    ...rows.filter((r) => r.id !== unassignedId),
    ...rows.filter((r) => r.id === unassignedId),
  ];

  return {
    items: sorted.map(toSourceGroupListItem),
  };
}
