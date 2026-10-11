import type { TriggerWorkflowParams, TriggerWorkflowResult } from "../types";
import { getWorkflowClient } from "../utils/get-workflow-client";
import { getWorkflowUrl } from "../utils/get-workflow-url";

export async function triggerWorkflow(
  params: TriggerWorkflowParams,
): Promise<TriggerWorkflowResult> {
  const { workflowRunId } = await getWorkflowClient().trigger({
    url: getWorkflowUrl(params.name),
    body: params.body,
    workflowRunId: params.workflowRunId,
    delay: params.delaySeconds,
    label: params.label,
  });

  return { workflowRunId };
}
