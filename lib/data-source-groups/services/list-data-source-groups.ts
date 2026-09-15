import { eq, sql } from "drizzle-orm";

import { dataSourceGroupMembers, dataSourceGroups } from "@/db/schema";
import { db } from "@/lib/db";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import type { ListDataSourceGroupsResult } from "../types";
import { toDataSourceGroupListItem } from "../utils/to-data-source-group-list-item";

export async function listDataSourceGroups(
  _params: Record<string, never>,
  ctx: WorkspaceContext,
): Promise<ListDataSourceGroupsResult> {
  const rows = await db
    .select({
      group: dataSourceGroups,
      memberCount: sql<number>`COUNT(${dataSourceGroupMembers.dataSourceId})::int`,
    })
    .from(dataSourceGroups)
    .leftJoin(
      dataSourceGroupMembers,
      eq(
        dataSourceGroupMembers.dataSourceGroupId,
        dataSourceGroups.id,
      ),
    )
    .where(eq(dataSourceGroups.workspaceId, ctx.workspaceId))
    .groupBy(dataSourceGroups.id)
    .orderBy(dataSourceGroups.name);

  return {
    items: rows.map((row) =>
      toDataSourceGroupListItem(row.group, row.memberCount),
    ),
  };
}
