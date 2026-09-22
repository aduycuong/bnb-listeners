import { researchRuns } from "@/db/schema";
import { db } from "@/lib/db";
import { addJob } from "@/lib/qstash/services/add-job-service";

import {
  DEFAULT_DEPTH,
  RESEARCH_INLINE_WAIT_MS,
  RESEARCH_POLL_INTERVAL_MS,
  RESEARCH_QSTASH_JOB_NAME,
} from "../config";
import type { StartResearchParams, StartResearchResult } from "../types";
import { buildBackground } from "../utils/build-background";
import { mirrorResearchStatus } from "../utils/mirror-research-status";
import { getResearchRun } from "./get-research-run";
import { triageResearch } from "./triage-research";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Waits up to `RESEARCH_INLINE_WAIT_MS` for the QStash worker to finish the
 * run, polling the DB. Returns the completed result on success within the
 * window; returns null on timeout or failure (caller falls back to jobId).
 */
async function waitForResult(
  workspaceId: string,
  runId: string,
): Promise<StartResearchResult | null> {
  const deadline = Date.now() + RESEARCH_INLINE_WAIT_MS;

  while (Date.now() < deadline) {
    await sleep(RESEARCH_POLL_INTERVAL_MS);

    const run = await getResearchRun({ workspaceId, runId });
    if (!run.found) continue;

    if (run.status === "succeeded" && run.result) {
      return {
        status: "completed",
        jobId: runId,
        report: run.result.report,
        sources: run.result.sources,
      };
    }

    if (run.status === "failed") {
      // Surface via get_research_status; fall back to the jobId here.
      return null;
    }
  }

  return null;
}

/**
 * Entry point for the `start_research` MCP tool. Runs synchronous triage
 * (approach A); when the request is ambiguous it returns clarifying questions
 * instead of enqueueing. Otherwise it creates a `research_runs` row and
 * dispatches the background QStash job, returning the run id as `jobId`.
 */
export async function startResearch(
  params: StartResearchParams,
): Promise<StartResearchResult> {
  const background = buildBackground(params.context, params.clarifications);
  const mode = params.clarificationMode ?? "ask";

  const triage = await triageResearch({
    query: params.query,
    background,
    mode,
  });

  if (triage.needsClarification) {
    return { status: "needs_clarification", questions: triage.questions };
  }

  const depth = params.depth ?? DEFAULT_DEPTH;

  const [run] = await db
    .insert(researchRuns)
    .values({
      workspaceId: params.workspaceId,
      query: params.query,
      background: background || null,
      depth,
      status: "pending",
    })
    .returning({ id: researchRuns.id });

  const runId = run!.id;

  await addJob({
    jobName: RESEARCH_QSTASH_JOB_NAME,
    payload: { runId },
    userId: params.userId ?? "mcp",
  });

  await mirrorResearchStatus({
    runId,
    workspaceId: params.workspaceId,
    status: "pending",
  });

  if (params.waitForResult === false) {
    return { status: "started", jobId: runId };
  }

  // Fast path: wait briefly for the worker to finish before handing back the
  // jobId. The QStash job keeps running regardless of this window.
  const completed = await waitForResult(params.workspaceId, runId);
  if (completed) {
    return completed;
  }

  return { status: "started", jobId: runId };
}
