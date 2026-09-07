import type { z } from "zod";

import type {
  createTopicBodySchema,
  mergeTopicsBodySchema,
  topicFormSchema,
  updateTopicBodySchema,
} from "./schema";

export type CreateTopicBody = z.infer<typeof createTopicBodySchema>;
export type CreateTopicParams = CreateTopicBody;
export type CreateTopicResult = TopicListItem;

export type UpdateTopicBody = z.infer<typeof updateTopicBodySchema>;
export type UpdateTopicParams = { id: string } & UpdateTopicBody;
export type UpdateTopicResult = TopicListItem;

export type DeleteTopicParams = { id: string };
export type DeleteTopicResult = { id: string; message: string };

export type BulkDeleteTopicsParams = { ids: string[] };
export type BulkDeleteTopicsFailure = { id: string; message: string };
export type BulkDeleteTopicsResult = {
  deletedIds: string[];
  failures: BulkDeleteTopicsFailure[];
  message: string;
};

export type MergeTopicsParams = z.infer<typeof mergeTopicsBodySchema>;
export type MergeTopicsFailure = { id: string; message: string };
export type MergeTopicsResult = {
  targetId: string;
  targetName: string;
  deletedIds: string[];
  failures: MergeTopicsFailure[];
  documentsAssigned: number;
  message: string;
};

export type TopicListItem = {
  id: string;
  name: string;
  description: string | null;
  createdBy: string;
  sourceDocumentId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ListTopicsResult = { items: TopicListItem[] };

export type TopicCardPeriodPreset =
  import("./topic-card-config").TopicCardPeriodPreset;

export type TopicCardSort = import("./topic-card-config").TopicCardSort;

export type TopicCardDigest = {
  docCount: number;
  avgQualityScore: number | null;
  trendScore: number | null;
  isStale: boolean;
};

export type TopicCardSparklinePoint = {
  dateKey: string;
  docCount: number;
};

export type TopicCardItem = {
  id: string;
  name: string;
  description: string | null;
  createdBy: string;
  createdAt: string;
  digest: TopicCardDigest;
  sparkline: TopicCardSparklinePoint[];
};

export type ResolvedTopicCardPeriod = {
  preset: TopicCardPeriodPreset;
  startDate: string;
  endDate: string;
};

export type ListTopicCardsParams = {
  period: TopicCardPeriodPreset;
  startDate?: string;
  endDate?: string;
  sort: TopicCardSort;
  offset?: number;
  limit?: number;
  /** Omit or empty for all jobs; pass UUIDs to filter to those jobs. */
  jobIds?: string[];
};

export type ListTopicCardsResult = {
  items: TopicCardItem[];
  hasMore: boolean;
  offset: number;
  limit: number;
  period: ResolvedTopicCardPeriod;
};

export type TopicFormValues = z.infer<typeof topicFormSchema>;
