import type { z } from "zod";

import type {
  createTopicBodySchema,
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

export type ListTopicsParams = {
  verified?: boolean;
};

export type TopicListItem = {
  id: string;
  name: string;
  parentId: string | null;
  parentName: string | null;
  description: string | null;
  verified: boolean;
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
  parentName: string | null;
  description: string | null;
  verified: boolean;
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
};

export type ListTopicCardsResult = {
  items: TopicCardItem[];
  hasMore: boolean;
  offset: number;
  limit: number;
  period: ResolvedTopicCardPeriod;
};

export type TopicFormValues = z.infer<typeof topicFormSchema>;
