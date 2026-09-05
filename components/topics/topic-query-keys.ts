import type {
  TopicCardPeriodPreset,
  TopicCardSort,
} from "@/lib/topics/topic-card-config";

export type TopicCardsQueryFilters = {
  period: TopicCardPeriodPreset;
  sort: TopicCardSort;
  startDate?: string;
  endDate?: string;
};

export const topicsQueryKey = (workspaceId: string) =>
  ["topics", workspaceId] as const;

export const topicCardsQueryKey = (
  workspaceId: string,
  filters: TopicCardsQueryFilters,
) => ["topic-cards", workspaceId, filters] as const;
