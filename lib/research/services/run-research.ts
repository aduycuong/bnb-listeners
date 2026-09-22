import { eq } from "drizzle-orm";

import { researchRuns } from "@/db/schema";
import { db } from "@/lib/db";
import { isExaConfigured } from "@/lib/exa/services/exa-answer";

import {
  getDepthConfig,
  RESEARCH_GRAPH_RECURSION_LIMIT,
  RESEARCH_SYSTEM_USER_ID,
} from "../config";
import { buildResearchGraph } from "../graph/build-research-graph";
import type { DepthLevel, ResearchRunResult } from "../types";
import { formatFindings } from "../utils/format-findings";
import { mirrorResearchStatus } from "../utils/mirror-research-status";

/**
 * Runs one research run end-to-end: loads the row, executes the LangGraph
 * research loop, and persists the report (or an error). Called by the QStash
 * job handler. Idempotent for terminal runs.
 */
export async function runResearch(runId: string): Promise<void> {
  const [run] = await db
    .select()
    .from(researchRuns)
    .where(eq(researchRuns.id, runId))
    .limit(1);

  if (!run) {
    console.warn(`[${runResearch.name}] Research run not found: ${runId}`);
    return;
  }

  if (run.status === "succeeded" || run.status === "failed") {
    return;
  }

  await db
    .update(researchRuns)
    .set({ status: "running", updatedAt: new Date() })
    .where(eq(researchRuns.id, runId));

  await mirrorResearchStatus({
    runId,
    workspaceId: run.workspaceId,
    status: "running",
  });

  try {
    const depth = getDepthConfig(run.depth as DepthLevel);
    const graph = buildResearchGraph({
      workspaceContext: {
        userId: RESEARCH_SYSTEM_USER_ID,
        workspaceId: run.workspaceId,
        permission: "owner",
      },
      webEnabled: false,
      maxIterations: depth.maxIterations,
      maxSubQueries: depth.maxSubQueries,
      synthesizeModel: depth.synthesizeModel,
    });

    const final = await graph.invoke(
      {
        query: run.query,
        background: run.background ?? "",
        plan: "",
        tasks: [],
        completedTaskKeys: [],
        findings: [],
        iteration: 0,
        sufficient: false,
        gaps: [],
        report: "",
      },
      { recursionLimit: RESEARCH_GRAPH_RECURSION_LIMIT },
    );

    const { sources } = formatFindings(final.findings);
    const result: ResearchRunResult = {
      report: final.report,
      sources,
      iterations: final.iteration,
      findingCount: final.findings.length,
    };

    await db
      .update(researchRuns)
      .set({
        status: "succeeded",
        result,
        error: null,
        finishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(researchRuns.id, runId));

    await mirrorResearchStatus({
      runId,
      workspaceId: run.workspaceId,
      status: "succeeded",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Research run failed.";

    await db
      .update(researchRuns)
      .set({
        status: "failed",
        error: message,
        finishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(researchRuns.id, runId));

    await mirrorResearchStatus({
      runId,
      workspaceId: run.workspaceId,
      status: "failed",
      error: message,
    });
  }
}
