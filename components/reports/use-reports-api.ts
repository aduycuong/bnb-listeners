"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { MetricsApiScope } from "@/components/metrics/use-metrics-api";
import type { ReportPeriod } from "@/lib/metrics/types";
import { projectFetch } from "@/lib/projects/utils/project-fetch";
import type { ReportDetail, ReportListItem } from "@/lib/reports/types";

export const reportsQueryKey = (projectId: string) => ["reports", projectId] as const;

async function fetchJson<T>(scope: MetricsApiScope, url: string, init?: RequestInit): Promise<T> {
  const res = await projectFetch(scope.workspaceId, scope.projectId, url, init);
  const body = (await res.json()) as T & { message?: string; error?: string };
  if (!res.ok) throw new Error(body.message ?? body.error ?? "Có lỗi xảy ra.");
  return body;
}

/** AI reports of the project, newest period first (D29). */
export function useReports(scope: MetricsApiScope) {
  return useQuery({
    queryKey: [...reportsQueryKey(scope.projectId), "list"],
    queryFn: () => fetchJson<{ items: ReportListItem[] }>(scope, "/api/reports"),
  });
}

export function useReport(scope: MetricsApiScope, reportId: string | null) {
  return useQuery({
    queryKey: [...reportsQueryKey(scope.projectId), "detail", reportId],
    queryFn: () => fetchJson<ReportDetail>(scope, `/api/reports/${reportId}`),
    enabled: Boolean(reportId),
  });
}

/** Generates or regenerates the report of a period; takes a few seconds (model call). */
export function useGenerateReport(scope: MetricsApiScope) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (period: ReportPeriod) =>
      fetchJson<ReportDetail>(scope, "/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: reportsQueryKey(scope.projectId) });
    },
  });
}
