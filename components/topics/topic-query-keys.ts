export type TopicCardsQueryFilters = {
  period: import("@/lib/topics/topic-card-config").TopicCardPeriodPreset;
  sort: import("@/lib/topics/topic-card-config").TopicCardSort;
  startDate?: string;
  endDate?: string;
  jobIds?: string[];
};

export type TopicDocumentsQueryFilters = {
  jobIds: string[];
  search: string;
};

export type TopicChartQueryFilters = {
  period: import("@/lib/topics/topic-detail-chart-config").TopicDetailChartPeriodPreset;
  metric: import("@/lib/topics/topic-detail-chart-config").TopicDetailChartMetric;
  startDate?: string;
  endDate?: string;
};

export const topicsQueryKey = (workspaceId: string) =>
  ["topics", workspaceId] as const;

export const topicQueryKey = (workspaceId: string, topicId: string) =>
  ["topic", workspaceId, topicId] as const;

export const topicChartQueryKey = (
  workspaceId: string,
  topicId: string,
  filters: TopicChartQueryFilters,
) => ["topic-chart", workspaceId, topicId, filters] as const;

export const topicDocumentsQueryKey = (
  workspaceId: string,
  topicId: string,
  filters: TopicDocumentsQueryFilters,
) => ["topic-documents", workspaceId, topicId, filters] as const;

export const workspaceJobsQueryKey = (workspaceId: string) =>
  ["workspace-jobs", workspaceId] as const;

export const topicCardsQueryKey = (
  workspaceId: string,
  filters: TopicCardsQueryFilters,
) => ["topic-cards", workspaceId, filters] as const;
