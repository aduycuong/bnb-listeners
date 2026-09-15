import { eq } from "drizzle-orm";

import { dataSourceGroupMembers, dataSources } from "@/db/schema";
import { db } from "@/lib/db";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import type {
  ListDataSourceGroupMembersParams,
  ListDataSourceGroupMembersResult,
} from "../types";
import { assertDataSourceGroupInWorkspace } from "../utils/assert-data-source-group-in-workspace";

export async function listDataSourceGroupMembers(
  params: ListDataSourceGroupMembersParams,
  ctx: WorkspaceContext,
): Promise<ListDataSourceGroupMembersResult> {
  await assertDataSourceGroupInWorkspace(params.id, ctx.workspaceId);

  const rows = await db
    .select({
      id: dataSources.id,
      name: dataSources.name,
      sourceType: dataSources.sourceType,
      enabled: dataSources.enabled,
      assignedBy: dataSourceGroupMembers.assignedBy,
      assignedAt: dataSourceGroupMembers.assignedAt,
    })
    .from(dataSourceGroupMembers)
    .innerJoin(
      dataSources,
      eq(dataSourceGroupMembers.dataSourceId, dataSources.id),
    )
    .where(
      eq(dataSourceGroupMembers.dataSourceGroupId, params.id),
    )
    .orderBy(dataSources.name);

  return {
    items: rows.map((row) => ({
      id: row.id,
      name: row.name,
      sourceType: row.sourceType,
      enabled: row.enabled,
      assignedBy: row.assignedBy,
      assignedAt: row.assignedAt.toISOString(),
    })),
  };
}
