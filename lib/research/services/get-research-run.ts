import { and, eq } from "drizzle-orm";

import { researchRuns } from "@/db/schema";
import { db } from "@/lib/db";

import type {
  ClarificationMode,
  DepthLevel,
  GetResearchRunParams,
  GetResearchRunResult,
  ResearchHtmlStatus,
  ResearchStatus,
} from "../types";

/**
 * Reads a research run scoped to the workspace. Source of truth for the
 * `get_research_status` MCP tool.
 */
export async function getResearchRun(
  params: GetResearchRunParams,
): Promise<GetResearchRunResult> {
  const [run] = await db
    .select()
    .from(researchRuns)
    .where(
      and(
        eq(researchRuns.id, params.runId),
        eq(researchRuns.workspaceId, params.workspaceId),
      ),
    )
    .limit(1);

  if (!run) {
    return { found: false };
  }

  return {
    found: true,
    status: run.status as ResearchStatus,
    query: run.query,
    context: run.context,
    clarificationMode: (run.clarificationMode ?? "ask") as ClarificationMode,
    background: run.background,
    depth: run.depth as DepthLevel,
    result: run.result ?? null,
    error: run.error,
    reportHtml: run.reportHtml ?? null,
    htmlStatus: (run.htmlStatus as ResearchHtmlStatus | null) ?? null,
    htmlError: run.htmlError ?? null,
    createdAt: run.createdAt.toISOString(),
    updatedAt: run.updatedAt.toISOString(),
    finishedAt: run.finishedAt?.toISOString() ?? null,
  };
}
