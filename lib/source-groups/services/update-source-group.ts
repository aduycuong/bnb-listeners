import { and, eq } from "drizzle-orm";

import { sourceGroups } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import type { UpdateSourceGroupParams, UpdateSourceGroupResult } from "../types";
import { assertUniqueSourceGroupName } from "../utils/assert-unique-source-group-name";
import { toSourceGroupListItem } from "../utils/to-source-group-list-item";

export async function updateSourceGroup(
  params: UpdateSourceGroupParams,
  ctx: WorkspaceContext,
): Promise<UpdateSourceGroupResult> {
  const { id, ...rest } = params;

  const [existing] = await db
    .select()
    .from(sourceGroups)
    .where(
      and(
        eq(sourceGroups.id, id),
        eq(sourceGroups.workspaceId, ctx.workspaceId),
      ),
    )
    .limit(1);

  if (!existing) {
    throw new NotFoundError("source group", id);
  }

  const updates: Partial<typeof sourceGroups.$inferInsert> = {};

  if (rest.name !== undefined) {
    const name = rest.name.trim();
    await assertUniqueSourceGroupName(ctx.workspaceId, name, id);
    updates.name = name;
  }

  if (rest.description !== undefined) {
    updates.description = rest.description?.trim() || null;
  }

  const [row] = await db
    .update(sourceGroups)
    .set(updates)
    .where(
      and(
        eq(sourceGroups.id, id),
        eq(sourceGroups.workspaceId, ctx.workspaceId),
      ),
    )
    .returning();

  if (!row) {
    throw new NotFoundError("source group", id);
  }

  return toSourceGroupListItem(row);
}
