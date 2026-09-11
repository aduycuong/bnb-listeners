export type TermCardsQueryFilters = {
  period: import("@/lib/terms/term-card-config").TermCardPeriodPreset;
  sort: import("@/lib/terms/term-card-config").TermCardSort;
  startDate?: string;
  endDate?: string;
  jobIds?: string[];
};

export type TermDocumentsQueryFilters = {
  jobIds: string[];
  search: string;
};

export type TermChartQueryFilters = {
  period: import("@/lib/terms/term-detail-chart-config").TermDetailChartPeriodPreset;
  metric: import("@/lib/terms/term-detail-chart-config").TermDetailChartMetric;
  startDate?: string;
  endDate?: string;
};

export const termsQueryKey = (workspaceId: string) =>
  ["terms", workspaceId] as const;

export const termQueryKey = (workspaceId: string, termId: string) =>
  ["term", workspaceId, termId] as const;

export const termChartQueryKey = (
  workspaceId: string,
  termId: string,
  filters: TermChartQueryFilters,
) => ["term-chart", workspaceId, termId, filters] as const;

export const termDocumentsQueryKey = (
  workspaceId: string,
  termId: string,
  filters: TermDocumentsQueryFilters,
) => ["term-documents", workspaceId, termId, filters] as const;

export const workspaceJobsQueryKey = (workspaceId: string) =>
  ["workspace-jobs", workspaceId] as const;

export const termCardsQueryKey = (
  workspaceId: string,
  filters: TermCardsQueryFilters,
) => ["term-cards", workspaceId, filters] as const;
