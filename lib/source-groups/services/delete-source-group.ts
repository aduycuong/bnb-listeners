import { and, eq } from "drizzle-orm";

import { sourceGroups } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import type { DeleteSourceGroupParams, DeleteSourceGroupResult } from "../types";

export async function deleteSourceGroup(
  params: DeleteSourceGroupParams,
  ctx: WorkspaceContext,
): Promise<DeleteSourceGroupResult> {
  const [deleted] = await db
    .delete(sourceGroups)
    .where(
      and(
        eq(sourceGroups.id, params.id),
        eq(sourceGroups.workspaceId, ctx.workspaceId),
      ),
    )
    .returning({ id: sourceGroups.id });

  if (!deleted) {
    throw new NotFoundError("source group", params.id);
  }

  return {
    id: deleted.id,
    message: `Source group ${deleted.id} deleted successfully`,
  };
}
