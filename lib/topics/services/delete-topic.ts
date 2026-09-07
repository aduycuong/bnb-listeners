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
  const [deleted] = await db
    .delete(topics)
    .where(
      and(
        eq(topics.id, params.id),
        eq(topics.workspaceId, ctx.workspaceId),
      ),
    )
    .returning({ id: topics.id });

  if (!deleted) {
    throw new NotFoundError("topic", params.id);
  }

  return {
    id: deleted.id,
    message: `Topic ${deleted.id} deleted successfully`,
  };
}
