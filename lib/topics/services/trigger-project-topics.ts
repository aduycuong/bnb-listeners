import { createHash } from "node:crypto";

import { triggerWorkflow } from "@/lib/workflows/services/trigger-workflow";

import { getTopicStage, type TopicStageKind } from "../config";

/**
 * Starts the grouping stage for one kind of a project. A run with nothing
 * new to embed or assign ends after a few queries, so extra triggers are
 * cheap. Runs of one (project, kind) execute one step at a time: concurrent
 * assign steps would each see the same groups and waiting mentions and
 * create the same group twice. Failures are logged, not thrown.
 */
export async function triggerProjectTopics(params: {
  projectId: string;
  kind?: TopicStageKind;
  /** Makes the trigger idempotent, e.g. per enrich run. */
  runKey?: string;
}): Promise<{ triggered: boolean }> {
  const spec = getTopicStage(params.kind);
  const scope = `${spec.kind}-${params.projectId}`;
  try {
    await triggerWorkflow({
      name: "topic-project",
      body: { projectId: params.projectId, kind: spec.kind },
      workflowRunId: params.runKey
        ? `topics-${scope}-${createHash("sha256").update(params.runKey).digest("hex").slice(0, 16)}`
        : undefined,
      label: `topics-${scope}`,
      flowControl: { key: `topics-${scope}`, parallelism: 1 },
    });
    return { triggered: true };
  } catch (error) {
    console.error("[topics] could not start a project topic run", {
      projectId: params.projectId,
      kind: spec.kind,
      error,
    });
    return { triggered: false };
  }
}
