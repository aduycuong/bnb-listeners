import { createHash } from "node:crypto";

import { triggerWorkflow } from "@/lib/workflows/services/trigger-workflow";

/**
 * Starts Enrich for a project. Planning finds nothing to do when nothing
 * changed, so extra triggers are cheap. Failures are logged, not thrown.
 */
export async function triggerProjectEnrich(params: {
  projectId: string;
  /** Makes the trigger idempotent, e.g. per match run. */
  runKey?: string;
}): Promise<{ triggered: boolean }> {
  try {
    await triggerWorkflow({
      name: "enrich-project",
      body: { projectId: params.projectId },
      workflowRunId: params.runKey
        ? `enrich-${params.projectId}-${createHash("sha256").update(params.runKey).digest("hex").slice(0, 16)}`
        : undefined,
      label: `enrich-${params.projectId}`,
    });
    return { triggered: true };
  } catch (error) {
    console.error("[enrichment] could not start a project enrich", {
      projectId: params.projectId,
      error,
    });
    return { triggered: false };
  }
}
