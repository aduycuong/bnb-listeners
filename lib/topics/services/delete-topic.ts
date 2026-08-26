import { and, eq } from "drizzle-orm";

import { topics } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import type { DeleteTopicParams, DeleteTopicResult } from "../types";

export async function deleteTopic(
  params: DeleteTopicParams,
  ctx: WorkspaceContext,
): Promise<DeleteTopicResult> {
  const deleted = await db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: topics.id })
      .from(topics)
      .where(
        and(
          eq(topics.id, params.id),
          eq(topics.workspaceId, ctx.workspaceId),
        ),
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundError("topic", params.id);
    }

    await tx
      .update(topics)
      .set({ parentId: null })
      .where(
        and(
          eq(topics.parentId, params.id),
          eq(topics.workspaceId, ctx.workspaceId),
        ),
      );

    const [row] = await tx
      .delete(topics)
      .where(
        and(
          eq(topics.id, params.id),
          eq(topics.workspaceId, ctx.workspaceId),
        ),
      )
      .returning({ id: topics.id });

    return row;
  });

  if (!deleted) {
    throw new NotFoundError("topic", params.id);
  }

  return {
    id: deleted.id,
    message: `Topic ${deleted.id} deleted successfully`,
  };
}
