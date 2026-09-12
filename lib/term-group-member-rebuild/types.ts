import type { z } from "zod";

import type { ChatModelId } from "@/lib/langchain";

import type {
  termGroupMemberRebuildCreateBodySchema,
  termGroupMemberRebuildEstimateBodySchema,
} from "./schema";

export type TermGroupMemberRebuildEstimate = {
  termCount: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
};

export type TermGroupMemberRebuildRunProgress = {
  termsScanned: number;
  termsMatched: number;
  termsRemoved: number;
  webQueries: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  cursor: { createdAt: string; termId: string } | null;
  cancelledAt?: string;
};

export type TermGroupMemberRebuildRunItem = {
  id: string;
  termGroupId: string;
  status: string;
  model: string;
  includeAlreadyMembers: boolean;
  removeNonMatching: boolean;
  enableWebResearch: boolean;
  confidenceMin: number;
  estimate: TermGroupMemberRebuildEstimate;
  result: TermGroupMemberRebuildRunProgress;
  error: string | null;
  startedAt: string;
  finishedAt: string | null;
};

export type EstimateTermGroupMemberRebuildParams = {
  id: string;
} & z.infer<typeof termGroupMemberRebuildEstimateBodySchema>;

export type EstimateTermGroupMemberRebuildResult = {
  model: ChatModelId;
  includeAlreadyMembers: boolean;
  removeNonMatching: boolean;
  enableWebResearch: boolean;
  confidenceMin: number;
  estimate: TermGroupMemberRebuildEstimate;
  webResearchAvailable: boolean;
};

export type CreateTermGroupMemberRebuildRunParams = {
  id: string;
} & z.infer<typeof termGroupMemberRebuildCreateBodySchema>;

export type CreateTermGroupMemberRebuildRunResult = {
  run: TermGroupMemberRebuildRunItem;
};

export type CancelTermGroupMemberRebuildRunParams = {
  id: string;
  runId: string;
};

export type CancelTermGroupMemberRebuildRunResult = {
  run: TermGroupMemberRebuildRunItem;
};

export type GetTermGroupMemberRebuildRunParams = {
  id: string;
  runId: string;
};

export type GetTermGroupMemberRebuildRunResult = {
  run: TermGroupMemberRebuildRunItem;
};

export type TermGroupMemberRebuildScanContext = {
  workspaceId: string;
  termGroupId: string;
  includeAlreadyMembers: boolean;
};
