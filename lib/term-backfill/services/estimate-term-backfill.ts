import { parseChatModel } from "@/lib/langchain";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import {
  DEFAULT_TERM_BACKFILL_MODEL,
  TERM_BACKFILL_CONFIDENCE_MIN,
} from "@/lib/terms/term-backfill-config";
import type {
  EstimateTermBackfillParams,
  EstimateTermBackfillResult,
} from "../types";
import { countBackfillCandidates } from "../utils/count-backfill-candidates";
import { estimateBackfillCost } from "../utils/estimate-backfill-cost";
import {
  assertValidBackfillListeningDate,
  loadTermBackfillContext,
} from "../utils/load-term-backfill-context";

export async function estimateTermBackfill(
  params: EstimateTermBackfillParams,
  ctx: WorkspaceContext,
): Promise<EstimateTermBackfillResult> {
  const term = await loadTermBackfillContext(params.id, ctx.workspaceId);
  const newListeningStartedAt = new Date(params.newListeningStartedAt);
  assertValidBackfillListeningDate(newListeningStartedAt, term.createdAt);

  const model = parseChatModel(params.model, DEFAULT_TERM_BACKFILL_MODEL);
  const qualityMin = params.qualityMin;

  const includeAlreadyAssigned = params.includeAlreadyAssigned;

  const { count, avgContentLength } = await countBackfillCandidates({
    workspaceId: ctx.workspaceId,
    termId: term.id,
    newListeningStartedAt,
    scanEndAt: term.createdAt,
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
    scanEndAt: term.createdAt.toISOString(),
    model,
    qualityMin,
    includeAlreadyAssigned,
    confidenceMin: TERM_BACKFILL_CONFIDENCE_MIN,
    estimate,
  };
}
