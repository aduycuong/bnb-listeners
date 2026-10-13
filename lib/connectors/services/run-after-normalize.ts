import { getConnector } from "../registry";
import type { AfterNormalizeResult } from "../types";
import { getCollectRun } from "../utils/get-collect-run";

type RunAfterNormalizeParams = {
  collectRunId: string;
};

/** Workflow step after the last normalize batch; a no-op for connectors without the hook. */
export async function runAfterNormalize(
  params: RunAfterNormalizeParams,
): Promise<AfterNormalizeResult> {
  const run = await getCollectRun(params.collectRunId);
  const connector = getConnector(run.connector);
  if (!connector.afterNormalize) return {};

  return connector.afterNormalize(
    { collectRunId: run.id, sourceId: run.sourceId },
    connector.paramsSchema.parse(run.params),
  );
}
