"use client";

import { AquaDemoDashboard } from "@/components/projects/demo/demo-dashboard";
import { ProjectPendingDashboard } from "@/components/projects/project-pending-dashboard";
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
  const { project, workspaceIndex, projectIndex } = useProjectRouteContext(
    workspaceIndexParam,
    projectIndexParam,
  );

  if (!project) {
    return null;
  }

  if (!project.isDemo) {
    return (
      <ProjectPendingDashboard
        project={project}
        settingsHref={getProjectNavHref(workspaceIndex, projectIndex, "settings")}
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
