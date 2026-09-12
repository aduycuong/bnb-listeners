import { eq } from "drizzle-orm";

import { termGroups } from "@/db/schema";
import { db } from "@/lib/db";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import type { UpdateTermGroupParams, UpdateTermGroupResult } from "../types";
import { assertTermGroupInWorkspace } from "../utils/assert-term-group-in-workspace";
import { assertUniqueTermGroupName } from "../utils/assert-unique-term-group-name";
import { countTermGroupMembers } from "../utils/count-term-group-members";
import { toTermGroupListItem } from "../utils/to-term-group-list-item";

export async function updateTermGroup(
  params: UpdateTermGroupParams,
  ctx: WorkspaceContext,
): Promise<UpdateTermGroupResult> {
  await assertTermGroupInWorkspace(params.id, ctx.workspaceId);

  if (params.name !== undefined) {
    await assertUniqueTermGroupName(
      ctx.workspaceId,
      params.name,
      params.id,
    );
  }

  const [group] = await db
    .update(termGroups)
    .set({
      name: params.name?.trim(),
      description:
        params.description === undefined
          ? undefined
          : params.description?.trim() || null,
    })
    .where(eq(termGroups.id, params.id))
    .returning();

  const memberCount = await countTermGroupMembers(params.id);

  return toTermGroupListItem(group!, memberCount);
}
