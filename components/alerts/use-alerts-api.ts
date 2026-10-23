"use client";

import { useQuery } from "@tanstack/react-query";

import type { ProjectAlertsResult } from "@/lib/alerts/types";
import { projectFetch } from "@/lib/projects/utils/project-fetch";

export type AlertsApiScope = { workspaceId: string; projectId: string };

async function fetchAlerts(scope: AlertsApiScope): Promise<ProjectAlertsResult> {
  const res = await projectFetch(scope.workspaceId, scope.projectId, "/api/alerts");
  const body = (await res.json()) as ProjectAlertsResult & { message?: string; error?: string };
  if (!res.ok) throw new Error(body.message ?? body.error ?? "Có lỗi xảy ra.");
  return body;
}

export function useProjectAlerts(scope: AlertsApiScope) {
  return useQuery({
    queryKey: ["alerts", scope.projectId],
    queryFn: () => fetchAlerts(scope),
  });
}
