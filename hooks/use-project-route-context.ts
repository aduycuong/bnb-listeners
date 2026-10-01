"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import type { ListProjectsResult, ProjectListItem } from "@/lib/projects/types";
import {
  clampProjectIndex,
  parseProjectIndexParam,
} from "@/lib/projects/utils/parse-project-index-param";
import { workspaceFetch } from "@/lib/workspaces/utils/workspace-fetch";

import {
  useWorkspaceRouteContext,
  type UseWorkspaceRouteContextResult,
} from "./use-workspace-route-context";

export const projectsQueryKey = (workspaceId: string) =>
  ["projects", workspaceId] as const;

export async function fetchProjects(
  workspaceId: string,
): Promise<ListProjectsResult> {
  const res = await workspaceFetch(workspaceId, "/api/projects");
  const data = (await res.json()) as ListProjectsResult & {
    error?: string;
    message?: string;
  };

  if (!res.ok) {
    throw new Error(data.message ?? data.error ?? "Could not load projects.");
  }

  return data;
}

export type UseProjectRouteContextResult = UseWorkspaceRouteContextResult & {
  project: ProjectListItem | null;
  projects: ProjectListItem[];
  projectIndex: number;
  projectsLoading: boolean;
  projectsError: Error | null;
};

export function useProjectRouteContext(
  workspaceIndexParam: string,
  projectIndexParam: string,
): UseProjectRouteContextResult {
  const router = useRouter();
  const workspaceRoute = useWorkspaceRouteContext(workspaceIndexParam);
  const workspaceId = workspaceRoute.workspace?.id;

  const { data, isLoading, error } = useQuery({
    queryKey: projectsQueryKey(workspaceId ?? "pending"),
    queryFn: () => fetchProjects(workspaceId!),
    enabled: Boolean(workspaceId),
  });

  const projects = data?.items ?? [];
  const parsedIndex = parseProjectIndexParam(projectIndexParam);
  const projectIndex =
    parsedIndex === null ? 0 : clampProjectIndex(parsedIndex, projects.length);
  const hasNoProjects = data !== undefined && projects.length === 0;
  const needsIndexRedirect =
    projects.length > 0 &&
    (parsedIndex === null || parsedIndex !== projectIndex);

  useEffect(() => {
    if (!workspaceRoute.workspace) {
      return;
    }

    if (hasNoProjects) {
      router.replace(`/w/${workspaceRoute.workspaceIndex}/projects`);
      return;
    }

    if (needsIndexRedirect) {
      router.replace(
        `/w/${workspaceRoute.workspaceIndex}/p/${projectIndex}`,
      );
    }
  }, [
    hasNoProjects,
    needsIndexRedirect,
    projectIndex,
    router,
    workspaceRoute.workspace,
    workspaceRoute.workspaceIndex,
  ]);

  return {
    ...workspaceRoute,
    project: needsIndexRedirect ? null : (projects[projectIndex] ?? null),
    projects,
    projectIndex,
    projectsLoading: isLoading,
    projectsError: error,
  };
}
