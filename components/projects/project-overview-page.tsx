"use client";

import { ProjectOverviewReport } from "@/components/metrics/project-overview-report";
import { AquaDemoDashboard } from "@/components/projects/demo/demo-dashboard";
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

  if (!project.isDemo) {
    return (
      <ProjectOverviewReport
        scope={{ workspaceId: workspace.id, projectId: project.id }}
        projectName={project.name}
        mentionsHref={getProjectNavHref(workspaceIndex, projectIndex, "mentions")}
      />
    );
  }

  return (
    <AquaDemoDashboard
      projectName={project.name}
      projectDescription={project.description}
      projectCase={project.case}
      settingsHref={getProjectNavHref(workspaceIndex, projectIndex, "settings")}
    />
  );
}
