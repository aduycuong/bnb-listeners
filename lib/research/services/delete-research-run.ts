import { and, eq } from "drizzle-orm";

import { researchRuns } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import type {
  DeleteResearchRunParams,
  DeleteResearchRunResult,
} from "../types";

export async function deleteResearchRun(
  params: DeleteResearchRunParams,
  ctx: WorkspaceContext,
): Promise<DeleteResearchRunResult> {
  const [deleted] = await db
    .delete(researchRuns)
    .where(
      and(
        eq(researchRuns.id, params.runId),
        eq(researchRuns.workspaceId, ctx.workspaceId),
      ),
    )
    .returning({ id: researchRuns.id, query: researchRuns.query });

  if (!deleted) {
    throw new NotFoundError("research run", params.runId);
  }

  return {
    id: deleted.id,
    message: "Research run deleted.",
  };
}
