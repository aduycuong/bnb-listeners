/**
 * Workflow names. Each name maps to the route `app/api/workflows/{name}/route.ts`.
 */
export const WORKFLOW_NAMES = [
  "ping",
  "collect-source",
  "schedule-collections",
  "match-project",
] as const;

export type WorkflowName = (typeof WORKFLOW_NAMES)[number];

export const WORKFLOW_ROUTE_PREFIX = "/api/workflows";
