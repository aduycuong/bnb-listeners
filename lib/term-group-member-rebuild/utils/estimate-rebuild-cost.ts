import type { ChatModelId } from "@/lib/langchain";

import {
  TERM_GROUP_MEMBER_REBUILD_EXA_TOKENS_PER_QUERY,
  TERM_GROUP_MEMBER_REBUILD_MODEL_PRICING,
  TERM_GROUP_MEMBER_REBUILD_OUTPUT_TOKENS_PER_TERM,
  TERM_GROUP_MEMBER_REBUILD_SYSTEM_PROMPT_TOKENS,
} from "@/lib/term-groups/term-group-member-rebuild-config";

import type { TermGroupMemberRebuildEstimate } from "../types";

const CHARS_PER_TOKEN = 4;
const AVG_TERM_DESCRIPTION_CHARS = 120;

export function estimateTermDescriptionTokens(): number {
  return Math.ceil(AVG_TERM_DESCRIPTION_CHARS / CHARS_PER_TOKEN);
}

export function estimateRebuildCost(params: {
  termCount: number;
  model: ChatModelId;
  enableWebResearch: boolean;
}): TermGroupMemberRebuildEstimate {
  const { termCount, model, enableWebResearch } = params;
  const perTermInputTokens = estimateTermDescriptionTokens() + 60;
  const inputTokens =
    TERM_GROUP_MEMBER_REBUILD_SYSTEM_PROMPT_TOKENS +
    termCount * perTermInputTokens +
    (enableWebResearch
      ? Math.ceil(termCount * 0.15) *
        TERM_GROUP_MEMBER_REBUILD_EXA_TOKENS_PER_QUERY
      : 0);
  const outputTokens =
    termCount * TERM_GROUP_MEMBER_REBUILD_OUTPUT_TOKENS_PER_TERM;

  const pricing = TERM_GROUP_MEMBER_REBUILD_MODEL_PRICING[model];
  const costUsd =
    (inputTokens / 1_000_000) * pricing.inputPerMTok +
    (outputTokens / 1_000_000) * pricing.outputPerMTok;

  return {
    termCount,
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
  const pricing = TERM_GROUP_MEMBER_REBUILD_MODEL_PRICING[params.model];
  const costUsd =
    (params.inputTokens / 1_000_000) * pricing.inputPerMTok +
    (params.outputTokens / 1_000_000) * pricing.outputPerMTok;

  return Math.round(costUsd * 10000) / 10000;
}
