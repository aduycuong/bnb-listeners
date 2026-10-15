import { createHash } from "node:crypto";

import { triggerWorkflow } from "@/lib/workflows/services/trigger-workflow";

/**
 * Starts the topic stage for a project. A run with nothing new to embed or
 * assign ends after a few queries, so extra triggers are cheap. Failures are
 * logged, not thrown.
 */
export async function triggerProjectTopics(params: {
  projectId: string;
  /** Makes the trigger idempotent, e.g. per enrich run. */
  runKey?: string;
}): Promise<{ triggered: boolean }> {
  try {
    await triggerWorkflow({
      name: "topic-project",
      body: { projectId: params.projectId },
      workflowRunId: params.runKey
        ? `topics-${params.projectId}-${createHash("sha256").update(params.runKey).digest("hex").slice(0, 16)}`
        : undefined,
      label: `topics-${params.projectId}`,
    });
    return { triggered: true };
  } catch (error) {
    console.error("[topics] could not start a project topic run", {
      projectId: params.projectId,
      error,
    });
    return { triggered: false };
  }
}
