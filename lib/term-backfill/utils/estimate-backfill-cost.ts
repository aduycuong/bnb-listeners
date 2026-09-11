import type { ChatModelId } from "@/lib/langchain";

import {
  TERM_BACKFILL_MODEL_PRICING,
  TERM_BACKFILL_OUTPUT_TOKENS_PER_DOC,
  TERM_BACKFILL_SYSTEM_PROMPT_TOKENS,
} from "@/lib/terms/term-backfill-config";

import type { TermBackfillEstimate } from "../types";

const CHARS_PER_TOKEN = 4;

export function estimateContentTokens(contentLength: number): number {
  return Math.ceil(
    Math.min(contentLength, 3_000) / CHARS_PER_TOKEN,
  );
}

export function estimateBackfillCost(params: {
  documentCount: number;
  avgContentLength: number;
  model: ChatModelId;
  batchCount?: number;
}): TermBackfillEstimate {
  const { documentCount, avgContentLength, model } = params;
  const perDocInputTokens =
    estimateContentTokens(avgContentLength) + 80;
  const inputTokens =
    TERM_BACKFILL_SYSTEM_PROMPT_TOKENS +
    documentCount * perDocInputTokens;
  const outputTokens = documentCount * TERM_BACKFILL_OUTPUT_TOKENS_PER_DOC;

  const pricing = TERM_BACKFILL_MODEL_PRICING[model];
  const costUsd =
    (inputTokens / 1_000_000) * pricing.inputPerMTok +
    (outputTokens / 1_000_000) * pricing.outputPerMTok;

  return {
    documentCount,
    inputTokens,
    outputTokens,
    costUsd: Math.round(costUsd * 10000) / 10000,
  };
}

export function computeTokenCostUsd(params: {
  inputTokens: number;
  outputTokens: number;
  model: ChatModelId;
}): number {
  const pricing = TERM_BACKFILL_MODEL_PRICING[params.model];
  const costUsd =
    (params.inputTokens / 1_000_000) * pricing.inputPerMTok +
    (params.outputTokens / 1_000_000) * pricing.outputPerMTok;

  return Math.round(costUsd * 10000) / 10000;
}
