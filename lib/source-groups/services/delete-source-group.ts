import { and, eq } from "drizzle-orm";

import { documents, jobs, sourceGroups } from "@/db/schema";
import { NotFoundError, ServiceError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import type { DeleteSourceGroupParams, DeleteSourceGroupResult } from "../types";
import { createNoGroupSourceGroup } from "./create-no-group-source-group";
import { getNoGroupId } from "../utils/get-no-group-id";

/**
 * Delete a source group.
 *
 * Before deleting, all jobs and documents that reference the group are moved:
 *  - to `moveToGroupId` when specified, or
 *  - to the workspace-scoped "No group" group otherwise.
 *
 * The "No group" row itself cannot be deleted.
 */
export async function deleteSourceGroup(
  params: DeleteSourceGroupParams,
  ctx: WorkspaceContext,
): Promise<DeleteSourceGroupResult> {
  const [target] = await db
    .select()
    .from(sourceGroups)
    .where(
      and(
        eq(sourceGroups.id, params.id),
        eq(sourceGroups.workspaceId, ctx.workspaceId),
      ),
    )
    .limit(1);

  if (!target) {
    throw new NotFoundError("source group", params.id);
  }

  if (params.id === getNoGroupId(ctx.workspaceId)) {
    throw new ServiceError("DELETE_FAILED", "The No group source group cannot be deleted.");
  }

  let moveToGroupId: string;

  if (params.moveToGroupId) {
    const [moveTarget] = await db
      .select({ id: sourceGroups.id })
      .from(sourceGroups)
      .where(
        and(
          eq(sourceGroups.id, params.moveToGroupId),
          eq(sourceGroups.workspaceId, ctx.workspaceId),
        ),
      )
      .limit(1);

    if (!moveTarget) {
      throw new NotFoundError("source group", params.moveToGroupId);
    }

    moveToGroupId = moveTarget.id;
  } else {
    const noGroup = await createNoGroupSourceGroup(ctx.workspaceId);
    moveToGroupId = noGroup.id;
  }

  await db
    .update(jobs)
    .set({ groupId: moveToGroupId })
    .where(eq(jobs.groupId, params.id));

  await db
    .update(documents)
    .set({ groupId: moveToGroupId })
    .where(eq(documents.groupId, params.id));

  await db
    .delete(sourceGroups)
    .where(
      and(
        eq(sourceGroups.id, params.id),
        eq(sourceGroups.workspaceId, ctx.workspaceId),
      ),
    );

  const [moveTargetName] = await db
    .select({ name: sourceGroups.name })
    .from(sourceGroups)
    .where(eq(sourceGroups.id, moveToGroupId))
    .limit(1);

  return {
    id: params.id,
    message: `Source group deleted. Jobs and documents moved to group "${moveTargetName?.name ?? moveToGroupId}".`,
  };
}
