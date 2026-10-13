import type { WorkflowRunLog } from "@upstash/workflow";

import { ServiceError } from "@/lib/common/service-errors";
import { getWorkflowClient } from "@/lib/workflows/utils/get-workflow-client";
import { getWorkflowUrl } from "@/lib/workflows/utils/get-workflow-url";

import type { AdminWorkflowRun, ListWorkflowRunsParams, ListWorkflowRunsResult } from "../types";

const DEFAULT_COUNT = 20;

function toAdminWorkflowRun(run: WorkflowRunLog): AdminWorkflowRun {
  const steps: AdminWorkflowRun["steps"] = [];
  let error: string | null = null;

  for (const group of run.steps) {
    if (group.type === "next") {
      for (const step of group.steps) {
        steps.push({
          name: step.stepName ?? "(next)",
          state: step.state,
          createdAt: null,
          out: null,
        });
        error ??= step.errors?.at(-1)?.error ?? null;
      }
      continue;
    }

    for (const step of group.steps) {
      steps.push({
        name: step.stepName,
        state: step.state,
        createdAt: new Date(step.createdAt).toISOString(),
        out: step.out,
      });
    }
  }

  return {
    workflowRunId: run.workflowRunId,
    state: run.workflowState,
    createdAt: new Date(run.workflowRunCreatedAt).toISOString(),
    completedAt: run.workflowRunCompletedAt
      ? new Date(run.workflowRunCompletedAt).toISOString()
      : null,
    steps,
    error,
  };
}

/** Recent runs of one workflow from the Upstash Workflow logs API, newest first. */
export async function listWorkflowRuns(
  params: ListWorkflowRunsParams,
): Promise<ListWorkflowRunsResult> {
  const { runs, cursor } = await getWorkflowClient()
    .logs({
      cursor: params.cursor,
      count: params.count ?? DEFAULT_COUNT,
      filter: { workflowUrl: getWorkflowUrl(params.workflow) },
    })
    .catch((error: unknown) => {
      // The local QStash dev server has no logs API; say so instead of a bare 500.
      const message = error instanceof Error ? error.message : String(error);
      throw new ServiceError("UNKNOWN", `Workflow logs unavailable: ${message}`);
    });

  return {
    runs: runs.map(toAdminWorkflowRun),
    cursor: cursor || null,
  };
}
