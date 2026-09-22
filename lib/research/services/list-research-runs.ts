import { desc, eq } from "drizzle-orm";

import { researchRuns } from "@/db/schema";
import { db } from "@/lib/db";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import type {
  DepthLevel,
  ListResearchRunsResult,
  ResearchRunListItem,
  ResearchStatus,
} from "../types";

function toResearchRunListItem(
  run: typeof researchRuns.$inferSelect,
): ResearchRunListItem {
  return {
    id: run.id,
    query: run.query,
    status: run.status as ResearchStatus,
    depth: run.depth as DepthLevel,
    createdAt: run.createdAt.toISOString(),
    finishedAt: run.finishedAt?.toISOString() ?? null,
    findingCount: run.result?.findingCount ?? null,
  };
}

export async function listResearchRuns(
  _params: Record<string, never>,
  ctx: WorkspaceContext,
): Promise<ListResearchRunsResult> {
  const rows = await db
    .select()
    .from(researchRuns)
    .where(eq(researchRuns.workspaceId, ctx.workspaceId))
    .orderBy(desc(researchRuns.createdAt));

  return {
    items: rows.map(toResearchRunListItem),
  };
}
