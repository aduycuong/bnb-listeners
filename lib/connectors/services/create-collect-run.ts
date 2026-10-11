import { eq } from "drizzle-orm";

import { collectRuns } from "@/db/schema";
import { db } from "@/lib/db";
import { triggerWorkflow } from "@/lib/workflows/services/trigger-workflow";

import { getConnector } from "../registry";
import type {
  CollectSourceWorkflowPayload,
  CreateCollectRunParams,
  CreateCollectRunResult,
} from "../types";

/**
 * Validates connector params, records a pending run and starts the
 * `collect-source` workflow for it. The run id doubles as the workflow run
 * id, so a duplicate trigger for the same run is rejected by QStash.
 */
export async function createCollectRun(
  params: CreateCollectRunParams,
): Promise<CreateCollectRunResult> {
  const connector = getConnector(params.connector);
  const connectorParams = connector.paramsSchema.parse(params.params) as Record<
    string,
    unknown
  >;

  const [run] = await db
    .insert(collectRuns)
    .values({
      connector: params.connector,
      sourceId: params.sourceId,
      params: connectorParams,
      status: "pending",
    })
    .returning({ id: collectRuns.id });

  const body: CollectSourceWorkflowPayload = { collectRunId: run.id };
  const { workflowRunId } = await triggerWorkflow({
    name: "collect-source",
    body,
    workflowRunId: `collect-${run.id}`,
    delaySeconds: params.delaySeconds,
    label: params.connector,
  });

  await db
    .update(collectRuns)
    .set({ workflowRunId })
    .where(eq(collectRuns.id, run.id));

  return { collectRunId: run.id, workflowRunId };
}
