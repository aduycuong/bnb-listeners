import type { TermChartQueryFilters } from "@/components/terms/term-query-keys";
import type { TermGroupTopTermsSort } from "@/lib/term-groups/types";
import type { TermDetailChartPeriodPreset } from "@/lib/terms/term-detail-chart-config";

export const termGroupsQueryKey = (workspaceId: string) =>
  ["term-groups", workspaceId] as const;

export const termGroupQueryKey = (workspaceId: string, groupId: string) =>
  ["term-group", workspaceId, groupId] as const;

export const termGroupChartQueryKey = (
  workspaceId: string,
  groupId: string,
  filters: TermChartQueryFilters,
) => ["term-group-chart", workspaceId, groupId, filters] as const;

export const termGroupMembersQueryKey = (
  workspaceId: string,
  groupId: string,
) => ["term-group-members", workspaceId, groupId] as const;

export type TermGroupTopTermsQueryFilters = {
  period: TermDetailChartPeriodPreset;
  sort: TermGroupTopTermsSort;
  startDate?: string;
  endDate?: string;
};

export const termGroupTopTermsQueryKey = (
  workspaceId: string,
  groupId: string,
  filters: TermGroupTopTermsQueryFilters,
) => ["term-group-top-terms", workspaceId, groupId, filters] as const;
