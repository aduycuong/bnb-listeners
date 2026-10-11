import type { NotifyWorkflowParams, NotifyWorkflowResult } from "../types";
import { getWorkflowClient } from "../utils/get-workflow-client";

export async function notifyWorkflow(
  params: NotifyWorkflowParams,
): Promise<NotifyWorkflowResult> {
  const responses = await getWorkflowClient().notify({
    eventId: params.eventId,
    eventData: params.eventData,
    workflowRunId: params.workflowRunId,
  });

  return { notifiedCount: responses.length };
}
