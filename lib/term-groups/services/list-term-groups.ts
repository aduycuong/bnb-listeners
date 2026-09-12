import { eq, sql } from "drizzle-orm";

import { termGroupMembers, termGroups } from "@/db/schema";
import { db } from "@/lib/db";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import type { ListTermGroupsResult } from "../types";
import { toTermGroupListItem } from "../utils/to-term-group-list-item";

export async function listTermGroups(
  _params: Record<string, never>,
  ctx: WorkspaceContext,
): Promise<ListTermGroupsResult> {
  const rows = await db
    .select({
      group: termGroups,
      memberCount: sql<number>`COUNT(${termGroupMembers.termId})::int`,
    })
    .from(termGroups)
    .leftJoin(
      termGroupMembers,
      eq(termGroupMembers.termGroupId, termGroups.id),
    )
    .where(eq(termGroups.workspaceId, ctx.workspaceId))
    .groupBy(termGroups.id)
    .orderBy(termGroups.name);

  return {
    items: rows.map((row) =>
      toTermGroupListItem(row.group, row.memberCount),
    ),
  };
}
