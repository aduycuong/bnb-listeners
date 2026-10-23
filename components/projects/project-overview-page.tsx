"use client";

import { ProjectOverviewReport } from "@/components/metrics/project-overview-report";
import { useProjectRouteContext } from "@/hooks/use-project-route-context";
import { getProjectNavHref } from "@/lib/dashboard/nav-items";

type ProjectOverviewPageProps = {
  workspaceIndexParam: string;
  projectIndexParam: string;
};

export function ProjectOverviewPage({
  workspaceIndexParam,
  projectIndexParam,
}: ProjectOverviewPageProps) {
  const { workspace, project, workspaceIndex, projectIndex } = useProjectRouteContext(
    workspaceIndexParam,
    projectIndexParam,
  );

  if (!workspace || !project) {
    return null;
  }

  return (
    <ProjectOverviewReport
      scope={{ workspaceId: workspace.id, projectId: project.id }}
      projectName={project.name}
      projectCase={project.case}
      caseHref={getProjectNavHref(workspaceIndex, projectIndex, "case")}
      banner={{
        name: project.name,
        description: project.description,
        projectCase: project.case,
        settingsHref: getProjectNavHref(workspaceIndex, projectIndex, "settings"),
      }}
      mentionsHref={getProjectNavHref(workspaceIndex, projectIndex, "mentions")}
    />
  );
}
