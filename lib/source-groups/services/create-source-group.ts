import { sourceGroups } from "@/db/schema";
import { CreateFailedError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import type { CreateSourceGroupParams, CreateSourceGroupResult } from "../types";
import { assertUniqueSourceGroupName } from "../utils/assert-unique-source-group-name";
import { toSourceGroupListItem } from "../utils/to-source-group-list-item";

export async function createSourceGroup(
  params: CreateSourceGroupParams,
  ctx: WorkspaceContext,
): Promise<CreateSourceGroupResult> {
  const name = params.name.trim();
  const description = params.description?.trim() || null;

  await assertUniqueSourceGroupName(ctx.workspaceId, name);

  const [row] = await db
    .insert(sourceGroups)
    .values({
      workspaceId: ctx.workspaceId,
      name,
      description,
    })
    .returning();

  if (!row) {
    throw new CreateFailedError("source group");
  }

  return toSourceGroupListItem(row);
}
