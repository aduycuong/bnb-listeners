"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import type { GetCompareReportsResult, GetReportsResult, ReportRequest } from "@/lib/metrics/types";
import { projectFetch } from "@/lib/projects/utils/project-fetch";

export type MetricsApiScope = { workspaceId: string; projectId: string };

export const metricsQueryKey = (projectId: string) => ["metrics", projectId] as const;

async function postReports<T>(scope: MetricsApiScope, url: string, body: unknown): Promise<T> {
  const res = await projectFetch(scope.workspaceId, scope.projectId, url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as T & { message?: string; error?: string };
  if (!res.ok) throw new Error(json.message ?? json.error ?? "Có lỗi xảy ra.");
  return json;
}

/**
 * The reports of a page for the picker's period, in one request (`POST /api/metrics/reports`).
 * Results keep the order of `reports`, typed per key.
 */
export function useReports<const R extends readonly ReportRequest[]>(
  scope: MetricsApiScope,
  days: number,
  reports: R,
  enabled = true,
) {
  return useQuery({
    queryKey: [...metricsQueryKey(scope.projectId), "reports", days, reports],
    queryFn: () => postReports<GetReportsResult<R>>(scope, "/api/metrics/reports", { days, reports }),
    placeholderData: keepPreviousData,
    enabled,
  });
}

/** The same reports for every member of a compare project (`POST /api/metrics/compare-reports`). */
export function useCompareReports<const R extends readonly ReportRequest[]>(
  scope: MetricsApiScope,
  days: number,
  reports: R,
) {
  return useQuery({
    queryKey: [...metricsQueryKey(scope.projectId), "compare-reports", days, reports],
    queryFn: () =>
      postReports<GetCompareReportsResult<R>>(scope, "/api/metrics/compare-reports", { days, reports }),
    placeholderData: keepPreviousData,
  });
}
