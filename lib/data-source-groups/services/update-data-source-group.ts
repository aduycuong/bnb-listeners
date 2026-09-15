import { eq } from "drizzle-orm";

import { dataSourceGroups } from "@/db/schema";
import { db } from "@/lib/db";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import type {
  UpdateDataSourceGroupParams,
  UpdateDataSourceGroupResult,
} from "../types";
import { assertDataSourceGroupInWorkspace } from "../utils/assert-data-source-group-in-workspace";
import { assertUniqueDataSourceGroupName } from "../utils/assert-unique-data-source-group-name";
import { countDataSourceGroupMembers } from "../utils/count-data-source-group-members";
import { toDataSourceGroupListItem } from "../utils/to-data-source-group-list-item";

export async function updateDataSourceGroup(
  params: UpdateDataSourceGroupParams,
  ctx: WorkspaceContext,
): Promise<UpdateDataSourceGroupResult> {
  await assertDataSourceGroupInWorkspace(params.id, ctx.workspaceId);

  if (params.name !== undefined) {
    await assertUniqueDataSourceGroupName(
      ctx.workspaceId,
      params.name,
      params.id,
    );
  }

  const [group] = await db
    .update(dataSourceGroups)
    .set({
      name: params.name?.trim(),
      description:
        params.description === undefined
          ? undefined
          : params.description?.trim() || null,
    })
    .where(eq(dataSourceGroups.id, params.id))
    .returning();

  const memberCount = await countDataSourceGroupMembers(params.id);

  return toDataSourceGroupListItem(group!, memberCount);
}
