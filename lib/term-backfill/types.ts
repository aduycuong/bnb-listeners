import type { z } from "zod";

import type { ChatModelId } from "@/lib/langchain";

import type {
  termBackfillCreateBodySchema,
  termBackfillEstimateBodySchema,
} from "./schema";

export type TermBackfillEstimate = {
  documentCount: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
};

export type TermBackfillRunProgress = {
  documentsScanned: number;
  documentsMatched: number;
  documentsSkipped: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  cursor: { publishedAt: string; documentId: string } | null;
  cancelledAt?: string;
};

export type TermBackfillRunItem = {
  id: string;
  termId: string;
  status: string;
  newListeningStartedAt: string;
  scanEndAt: string;
  model: string;
  qualityMin: number;
  includeAlreadyAssigned: boolean;
  confidenceMin: number;
  estimate: TermBackfillEstimate;
  result: TermBackfillRunProgress;
  error: string | null;
  startedAt: string;
  finishedAt: string | null;
};

export type EstimateTermBackfillParams = {
  id: string;
} & z.infer<typeof termBackfillEstimateBodySchema>;

export type EstimateTermBackfillResult = {
  newListeningStartedAt: string;
  scanEndAt: string;
  model: ChatModelId;
  qualityMin: number;
  includeAlreadyAssigned: boolean;
  confidenceMin: number;
  estimate: TermBackfillEstimate;
};

export type CreateTermBackfillRunParams = {
  id: string;
} & z.infer<typeof termBackfillCreateBodySchema>;

export type CreateTermBackfillRunResult = {
  run: TermBackfillRunItem;
};

export type CancelTermBackfillRunParams = {
  id: string;
  runId: string;
};

export type CancelTermBackfillRunResult = {
  run: TermBackfillRunItem;
};

export type GetTermBackfillRunParams = {
  id: string;
  runId: string;
};

export type GetTermBackfillRunResult = {
  run: TermBackfillRunItem;
};

export type ProcessTermBackfillBatchPayload = {
  runId: string;
};

export type TermBackfillScanContext = {
  workspaceId: string;
  termId: string;
  newListeningStartedAt: Date;
  scanEndAt: Date;
  qualityMin: number;
  includeAlreadyAssigned: boolean;
};
