import { WORKFLOW_ROUTE_PREFIX, type WorkflowName } from "../constants";
import { getWorkflowBaseUrl } from "./get-workflow-base-url";

/** Absolute URL of a workflow route. */
export function getWorkflowUrl(name: WorkflowName): string {
  return `${getWorkflowBaseUrl()}${WORKFLOW_ROUTE_PREFIX}/${name}`;
}
