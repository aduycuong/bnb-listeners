import { and, eq } from "drizzle-orm";

import { documents, jobs, sourceGroups } from "@/db/schema";
import { NotFoundError, ServiceError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import type { DeleteSourceGroupParams, DeleteSourceGroupResult } from "../types";
import { getUnassignedGroupId } from "../utils/get-unassigned-group-id";
import { findOrCreateUnassignedGroup } from "./find-or-create-unassigned-group";

/**
 * Delete a source group.
 *
 * Before deleting, all jobs and documents that reference the group are moved:
 *  - to `moveToGroupId` when specified, or
 *  - to the workspace-scoped "Unassigned" group (created on demand) otherwise.
 *
 * The unassigned group itself cannot be deleted.
 */
export async function deleteSourceGroup(
  params: DeleteSourceGroupParams,
  ctx: WorkspaceContext,
): Promise<DeleteSourceGroupResult> {
  // 1. Load the group to be deleted.
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

  if (params.id === getUnassignedGroupId(ctx.workspaceId)) {
    throw new ServiceError("DELETE_FAILED", "The unassigned group cannot be deleted.");
  }

  // 2. Resolve the move-to group.
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
    const unassigned = await findOrCreateUnassignedGroup(ctx.workspaceId);
    moveToGroupId = unassigned.id;
  }

  // 3. Reassign jobs and documents to the move-to group.
  await db
    .update(jobs)
    .set({ groupId: moveToGroupId })
    .where(eq(jobs.groupId, params.id));

  await db
    .update(documents)
    .set({ groupId: moveToGroupId })
    .where(eq(documents.groupId, params.id));

  // 4. Delete the group — topic_digest_daily rows cascade via FK.
  await db
    .delete(sourceGroups)
    .where(
      and(
        eq(sourceGroups.id, params.id),
        eq(sourceGroups.workspaceId, ctx.workspaceId),
      ),
    );

  return {
    id: params.id,
    message: `Source group deleted. Jobs and documents moved to group "${moveToGroupId}".`,
  };
}
