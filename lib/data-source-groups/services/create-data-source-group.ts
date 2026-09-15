import { dataSourceGroups } from "@/db/schema";
import { CreateFailedError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import type {
  CreateDataSourceGroupParams,
  CreateDataSourceGroupResult,
} from "../types";
import { assertUniqueDataSourceGroupName } from "../utils/assert-unique-data-source-group-name";
import { toDataSourceGroupListItem } from "../utils/to-data-source-group-list-item";

export async function createDataSourceGroup(
  params: CreateDataSourceGroupParams,
  ctx: WorkspaceContext,
): Promise<CreateDataSourceGroupResult> {
  const name = params.name.trim();
  const description = params.description?.trim() || null;

  await assertUniqueDataSourceGroupName(ctx.workspaceId, name);

  const [group] = await db
    .insert(dataSourceGroups)
    .values({
      workspaceId: ctx.workspaceId,
      name,
      description,
    })
    .returning();

  if (!group) {
    throw new CreateFailedError("data source group");
  }

  return toDataSourceGroupListItem(group, 0);
}
