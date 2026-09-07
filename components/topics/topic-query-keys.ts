export type TopicCardsQueryFilters = {
  period: import("@/lib/topics/topic-card-config").TopicCardPeriodPreset;
  sort: import("@/lib/topics/topic-card-config").TopicCardSort;
  startDate?: string;
  endDate?: string;
  jobIds?: string[];
};

export const topicsQueryKey = (workspaceId: string) =>
  ["topics", workspaceId] as const;

export const workspaceJobsQueryKey = (workspaceId: string) =>
  ["workspace-jobs", workspaceId] as const;

export const topicCardsQueryKey = (
  workspaceId: string,
  filters: TopicCardsQueryFilters,
) => ["topic-cards", workspaceId, filters] as const;
