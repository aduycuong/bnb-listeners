import type { TermBackfillRun } from "@/db/schema";

import type { TermBackfillRunItem } from "../types";

export function toTermBackfillRunItem(
  run: TermBackfillRun,
): TermBackfillRunItem {
  return {
    id: run.id,
    termId: run.termId,
    status: run.status,
    newListeningStartedAt: run.newListeningStartedAt.toISOString(),
    scanEndAt: run.scanEndAt.toISOString(),
    model: run.model,
    qualityMin: run.qualityMin,
    includeAlreadyAssigned: run.includeAlreadyAssigned,
    confidenceMin: run.confidenceMin,
    estimate: run.estimate,
    result: run.result,
    error: run.error,
    startedAt: run.startedAt.toISOString(),
    finishedAt: run.finishedAt?.toISOString() ?? null,
  };
}
