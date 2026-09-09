import { parseChatModel } from "@/lib/langchain";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import {
  DEFAULT_TOPIC_BACKFILL_MODEL,
  TOPIC_BACKFILL_CONFIDENCE_MIN,
} from "@/lib/topics/topic-backfill-config";
import type {
  EstimateTopicBackfillParams,
  EstimateTopicBackfillResult,
} from "../types";
import { countBackfillCandidates } from "../utils/count-backfill-candidates";
import { estimateBackfillCost } from "../utils/estimate-backfill-cost";
import {
  assertValidBackfillListeningDate,
  loadTopicBackfillContext,
} from "../utils/load-topic-backfill-context";

export async function estimateTopicBackfill(
  params: EstimateTopicBackfillParams,
  ctx: WorkspaceContext,
): Promise<EstimateTopicBackfillResult> {
  const topic = await loadTopicBackfillContext(params.id, ctx.workspaceId);
  const newListeningStartedAt = new Date(params.newListeningStartedAt);
  assertValidBackfillListeningDate(newListeningStartedAt, topic.createdAt);

  const model = parseChatModel(params.model, DEFAULT_TOPIC_BACKFILL_MODEL);
  const qualityMin = params.qualityMin;

  const includeAlreadyAssigned = params.includeAlreadyAssigned;

  const { count, avgContentLength } = await countBackfillCandidates({
    workspaceId: ctx.workspaceId,
    topicId: topic.id,
    newListeningStartedAt,
    scanEndAt: topic.createdAt,
    qualityMin,
    includeAlreadyAssigned,
  });

  const estimate = estimateBackfillCost({
    documentCount: count,
    avgContentLength,
    model,
  });

  return {
    newListeningStartedAt: newListeningStartedAt.toISOString(),
    scanEndAt: topic.createdAt.toISOString(),
    model,
    qualityMin,
    includeAlreadyAssigned,
    confidenceMin: TOPIC_BACKFILL_CONFIDENCE_MIN,
    estimate,
  };
}
