import { termGroups } from "@/db/schema";
import { CreateFailedError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import type { CreateTermGroupParams, CreateTermGroupResult } from "../types";
import { assertUniqueTermGroupName } from "../utils/assert-unique-term-group-name";
import { toTermGroupListItem } from "../utils/to-term-group-list-item";

export async function createTermGroup(
  params: CreateTermGroupParams,
  ctx: WorkspaceContext,
): Promise<CreateTermGroupResult> {
  const name = params.name.trim();
  const description = params.description?.trim() || null;

  await assertUniqueTermGroupName(ctx.workspaceId, name);

  const [group] = await db
    .insert(termGroups)
    .values({
      workspaceId: ctx.workspaceId,
      name,
      description,
    })
    .returning();

  if (!group) {
    throw new CreateFailedError("term group");
  }

  return toTermGroupListItem(group, 0);
}
