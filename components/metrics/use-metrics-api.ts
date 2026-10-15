"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import type { OverviewMetricsResult, SentimentMetricsResult } from "@/lib/metrics/types";
import { projectFetch } from "@/lib/projects/utils/project-fetch";

export type MetricsApiScope = { workspaceId: string; projectId: string };

export const metricsQueryKey = (projectId: string) => ["metrics", projectId] as const;

async function fetchJson<T>(scope: MetricsApiScope, url: string): Promise<T> {
  const res = await projectFetch(scope.workspaceId, scope.projectId, url);
  const body = (await res.json()) as T & { message?: string; error?: string };
  if (!res.ok) throw new Error(body.message ?? body.error ?? "Có lỗi xảy ra.");
  return body;
}

export function useOverviewMetrics(scope: MetricsApiScope, days: number) {
  return useQuery({
    queryKey: [...metricsQueryKey(scope.projectId), "overview", days],
    queryFn: () => fetchJson<OverviewMetricsResult>(scope, `/api/metrics/overview?days=${days}`),
    placeholderData: keepPreviousData,
  });
}

export function useSentimentMetrics(scope: MetricsApiScope, days: number) {
  return useQuery({
    queryKey: [...metricsQueryKey(scope.projectId), "sentiment", days],
    queryFn: () => fetchJson<SentimentMetricsResult>(scope, `/api/metrics/sentiment?days=${days}`),
    placeholderData: keepPreviousData,
  });
}
