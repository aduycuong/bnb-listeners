export type TermCardsQueryFilters = {
  period: import("@/lib/terms/term-card-config").TermCardPeriodPreset;
  sort: import("@/lib/terms/term-card-config").TermCardSort;
  startDate?: string;
  endDate?: string;
  dataSourceIds?: string[];
  search?: string;
};

export type TermDocumentsQueryFilters = {
  dataSourceIds: string[];
  search: string;
};

export type TermChartQueryFilters = {
  period: import("@/lib/terms/term-detail-chart-config").TermDetailChartPeriodPreset;
  metric: import("@/lib/terms/term-detail-chart-config").TermDetailChartMetric;
  startDate?: string;
  endDate?: string;
};

export const termsQueryKey = (workspaceId: string, projectId: string) =>
  ["terms", workspaceId, projectId] as const;

export const termQueryKey = (
  workspaceId: string,
  projectId: string,
  termId: string,
) => ["term", workspaceId, projectId, termId] as const;

export const termChartQueryKey = (
  workspaceId: string,
  projectId: string,
  termId: string,
  filters: TermChartQueryFilters,
) => ["term-chart", workspaceId, projectId, termId, filters] as const;

export const termDocumentsQueryKey = (
  workspaceId: string,
  projectId: string,
  termId: string,
  filters: TermDocumentsQueryFilters,
) => ["term-documents", workspaceId, projectId, termId, filters] as const;

export const workspaceJobsQueryKey = (workspaceId: string) =>
  ["workspace-jobs", workspaceId] as const;

export const termCardsQueryKey = (
  workspaceId: string,
  projectId: string,
  filters: TermCardsQueryFilters,
) => ["term-cards", workspaceId, projectId, filters] as const;
