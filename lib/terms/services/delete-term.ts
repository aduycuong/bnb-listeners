import { and, eq } from "drizzle-orm";

import { terms } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import type { DeleteTermParams, DeleteTermResult } from "../types";

export async function deleteTerm(
  params: DeleteTermParams,
  ctx: WorkspaceContext,
): Promise<DeleteTermResult> {
  const [deleted] = await db
    .delete(terms)
    .where(
      and(
        eq(terms.id, params.id),
        eq(terms.workspaceId, ctx.workspaceId),
      ),
    )
    .returning({ id: terms.id });

  if (!deleted) {
    throw new NotFoundError("term", params.id);
  }

  return {
    id: deleted.id,
    message: `Term ${deleted.id} deleted successfully`,
  };
}
