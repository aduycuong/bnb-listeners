export type TopicCardsQueryFilters = {
  period: import("@/lib/topics/topic-card-config").TopicCardPeriodPreset;
  sort: import("@/lib/topics/topic-card-config").TopicCardSort;
  startDate?: string;
  endDate?: string;
  groupIds?: string[];
};

export const topicsQueryKey = (workspaceId: string) =>
  ["topics", workspaceId] as const;

export const sourceGroupsQueryKey = (workspaceId: string) =>
  ["source-groups", workspaceId] as const;

export const topicCardsQueryKey = (
  workspaceId: string,
  filters: TopicCardsQueryFilters,
) => ["topic-cards", workspaceId, filters] as const;
