import { and, eq } from "drizzle-orm";

import { termGroups } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import type { DeleteTermGroupParams, DeleteTermGroupResult } from "../types";

export async function deleteTermGroup(
  params: DeleteTermGroupParams,
  ctx: WorkspaceContext,
): Promise<DeleteTermGroupResult> {
  const [deleted] = await db
    .delete(termGroups)
    .where(
      and(
        eq(termGroups.id, params.id),
        eq(termGroups.workspaceId, ctx.workspaceId),
      ),
    )
    .returning({ id: termGroups.id, name: termGroups.name });

  if (!deleted) {
    throw new NotFoundError("term group", params.id);
  }

  return {
    id: deleted.id,
    message: `Term group “${deleted.name}” deleted successfully.`,
  };
}
