import type { WorkflowRunLog } from "@upstash/workflow";

import { ServiceError } from "@/lib/common/service-errors";
import { WORKFLOW_NAMES } from "@/lib/workflows/constants";
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
    workflow: run.workflowUrl.split("/").at(-1) ?? run.workflowUrl,
    workflowUrl: run.workflowUrl,
    state: run.workflowState,
    createdAt: new Date(run.workflowRunCreatedAt).toISOString(),
    completedAt: run.workflowRunCompletedAt
      ? new Date(run.workflowRunCompletedAt).toISOString()
      : null,
    steps,
    error,
  };
}

/**
 * Recent workflow runs from the Upstash Workflow logs API, newest first: of one
 * workflow, or of every workflow of this server (the QStash account may serve
 * other environments, so runs are always filtered by this server's URLs).
 */
export async function listWorkflowRuns(
  params: ListWorkflowRunsParams,
): Promise<ListWorkflowRunsResult> {
  const { runs, cursor } = await getWorkflowClient()
    .logs({
      cursor: params.cursor,
      count: params.count ?? DEFAULT_COUNT,
      filter: {
        workflowUrl: params.workflow
          ? getWorkflowUrl(params.workflow)
          : WORKFLOW_NAMES.map((name) => getWorkflowUrl(name)),
        state: params.state,
      },
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
