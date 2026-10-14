import { triggerWorkflow } from "@/lib/workflows/services/trigger-workflow";

import { loadProjectMatchContext } from "./load-project-match-context";

/**
 * Starts a full match when the project's queries or sources changed since the
 * last one. Failures are logged, not thrown: saving config must not depend on
 * the workflow service.
 */
export async function syncProjectMatch(params: {
  projectId: string;
}): Promise<{ triggered: boolean }> {
  try {
    const ctx = await loadProjectMatchContext({ projectId: params.projectId });
    if (ctx.signature === ctx.storedSignature) return { triggered: false };

    await triggerWorkflow({
      name: "match-project",
      body: { projectId: params.projectId },
      // Same config → same run id, so double saves do not start two matches.
      workflowRunId: `match-${params.projectId}-${ctx.signature}`,
      label: `match ${params.projectId}`,
    });
    return { triggered: true };
  } catch (error) {
    console.error("[matching] could not start a project match", {
      projectId: params.projectId,
      error,
    });
    return { triggered: false };
  }
}
