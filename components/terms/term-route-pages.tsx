"use client";

import { TermDetailPage } from "@/components/terms/term-detail-page";
import { TermListPage } from "@/components/terms/term-list-page";
import { useProjectRouteContext } from "@/hooks/use-project-route-context";

type TermListRoutePageProps = {
  workspaceIndexParam: string;
  projectIndexParam: string;
};

export function TermListRoutePage({
  workspaceIndexParam,
  projectIndexParam,
}: TermListRoutePageProps) {
  const { workspace, workspaceIndex, project, projectIndex } =
    useProjectRouteContext(workspaceIndexParam, projectIndexParam);

  if (!workspace || !project) {
    return null;
  }

  return (
    <TermListPage
      workspace={workspace}
      workspaceIndex={workspaceIndex}
      project={project}
      projectIndex={projectIndex}
    />
  );
}

type TermDetailRoutePageProps = {
  workspaceIndexParam: string;
  projectIndexParam: string;
  termId: string;
};

export function TermDetailRoutePage({
  workspaceIndexParam,
  projectIndexParam,
  termId,
}: TermDetailRoutePageProps) {
  const { workspace, workspaceIndex, project, projectIndex } =
    useProjectRouteContext(workspaceIndexParam, projectIndexParam);

  if (!workspace || !project) {
    return null;
  }

  return (
    <TermDetailPage
      workspace={workspace}
      workspaceIndex={workspaceIndex}
      project={project}
      projectIndex={projectIndex}
      termId={termId}
    />
  );
}
