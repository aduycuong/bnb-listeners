import { eq } from "drizzle-orm";

import { dataSourceGroups } from "@/db/schema";
import { db } from "@/lib/db";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import type { DataSourceGroupDetail, GetDataSourceGroupParams } from "../types";
import { assertDataSourceGroupInWorkspace } from "../utils/assert-data-source-group-in-workspace";
import { countDataSourceGroupMembers } from "../utils/count-data-source-group-members";
import { toDataSourceGroupListItem } from "../utils/to-data-source-group-list-item";

export async function getDataSourceGroup(
  params: GetDataSourceGroupParams,
  ctx: WorkspaceContext,
): Promise<DataSourceGroupDetail> {
  await assertDataSourceGroupInWorkspace(params.id, ctx.workspaceId);

  const [group] = await db
    .select()
    .from(dataSourceGroups)
    .where(eq(dataSourceGroups.id, params.id))
    .limit(1);

  const memberCount = await countDataSourceGroupMembers(params.id);

  return toDataSourceGroupListItem(group!, memberCount);
}
