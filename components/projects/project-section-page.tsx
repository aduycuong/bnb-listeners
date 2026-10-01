"use client";

import { AquaDemoDashboard } from "@/components/projects/demo/demo-dashboard";
import { useProjectRouteContext } from "@/hooks/use-project-route-context";
import {
  getProjectNavHref,
  type ProjectDemoSection,
} from "@/lib/dashboard/nav-items";

type ProjectSectionPageProps = {
  workspaceIndexParam: string;
  projectIndexParam: string;
  section: ProjectDemoSection;
};

export function ProjectSectionPage({
  workspaceIndexParam,
  projectIndexParam,
  section,
}: ProjectSectionPageProps) {
  const { project, workspaceIndex, projectIndex } = useProjectRouteContext(
    workspaceIndexParam,
    projectIndexParam,
  );

  if (!project) {
    return null;
  }

  return (
    <AquaDemoDashboard
      projectName={project.name}
      projectDescription={project.description}
      projectCase={project.case}
      section={section}
      settingsHref={getProjectNavHref(workspaceIndex, projectIndex, "settings")}
    />
  );
}
