import { WORKFLOW_ROUTE_PREFIX, type WorkflowName } from "../constants";

/**
 * Absolute URL of a workflow route. `UPSTASH_WORKFLOW_URL` overrides the app
 * URL so a local tunnel can be used in development; the serve handler reads
 * the same variable for its own callback URLs.
 */
export function getWorkflowUrl(name: WorkflowName): string {
  const baseUrl = (
    process.env.UPSTASH_WORKFLOW_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim()
  )?.replace(/\/$/, "");

  if (!baseUrl) {
    throw new Error(
      "UPSTASH_WORKFLOW_URL or NEXT_PUBLIC_APP_URL environment variable must be set",
    );
  }

  return `${baseUrl}${WORKFLOW_ROUTE_PREFIX}/${name}`;
}
