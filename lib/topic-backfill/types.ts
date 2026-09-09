import type { z } from "zod";

import type { ChatModelId } from "@/lib/langchain";

import type {
  topicBackfillCreateBodySchema,
  topicBackfillEstimateBodySchema,
} from "./schema";

export type TopicBackfillEstimate = {
  documentCount: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
};

export type TopicBackfillRunProgress = {
  documentsScanned: number;
  documentsMatched: number;
  documentsSkipped: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  cursor: { publishedAt: string; documentId: string } | null;
  cancelledAt?: string;
};

export type TopicBackfillRunItem = {
  id: string;
  topicId: string;
  status: string;
  newListeningStartedAt: string;
  scanEndAt: string;
  model: string;
  qualityMin: number;
  includeAlreadyAssigned: boolean;
  confidenceMin: number;
  estimate: TopicBackfillEstimate;
  result: TopicBackfillRunProgress;
  error: string | null;
  startedAt: string;
  finishedAt: string | null;
};

export type EstimateTopicBackfillParams = {
  id: string;
} & z.infer<typeof topicBackfillEstimateBodySchema>;

export type EstimateTopicBackfillResult = {
  newListeningStartedAt: string;
  scanEndAt: string;
  model: ChatModelId;
  qualityMin: number;
  includeAlreadyAssigned: boolean;
  confidenceMin: number;
  estimate: TopicBackfillEstimate;
};

export type CreateTopicBackfillRunParams = {
  id: string;
} & z.infer<typeof topicBackfillCreateBodySchema>;

export type CreateTopicBackfillRunResult = {
  run: TopicBackfillRunItem;
};

export type CancelTopicBackfillRunParams = {
  id: string;
  runId: string;
};

export type CancelTopicBackfillRunResult = {
  run: TopicBackfillRunItem;
};

export type GetTopicBackfillRunParams = {
  id: string;
  runId: string;
};

export type GetTopicBackfillRunResult = {
  run: TopicBackfillRunItem;
};

export type ProcessTopicBackfillBatchPayload = {
  runId: string;
};

export type TopicBackfillScanContext = {
  workspaceId: string;
  topicId: string;
  newListeningStartedAt: Date;
  scanEndAt: Date;
  qualityMin: number;
  includeAlreadyAssigned: boolean;
};
