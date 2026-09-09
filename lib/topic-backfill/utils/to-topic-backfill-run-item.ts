import type { TopicBackfillRun } from "@/db/schema";

import type { TopicBackfillRunItem } from "../types";

export function toTopicBackfillRunItem(
  run: TopicBackfillRun,
): TopicBackfillRunItem {
  return {
    id: run.id,
    topicId: run.topicId,
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
