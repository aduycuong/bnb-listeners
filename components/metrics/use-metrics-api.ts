"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import type { GetReportsResult, ReportRequest } from "@/lib/metrics/types";
import { projectFetch } from "@/lib/projects/utils/project-fetch";

export type MetricsApiScope = { workspaceId: string; projectId: string };

export const metricsQueryKey = (projectId: string) => ["metrics", projectId] as const;

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
    queryFn: async () => {
      const res = await projectFetch(scope.workspaceId, scope.projectId, "/api/metrics/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days, reports }),
      });
      const body = (await res.json()) as GetReportsResult<R> & { message?: string; error?: string };
      if (!res.ok) throw new Error(body.message ?? body.error ?? "Có lỗi xảy ra.");
      return body;
    },
    placeholderData: keepPreviousData,
    enabled,
  });
}
