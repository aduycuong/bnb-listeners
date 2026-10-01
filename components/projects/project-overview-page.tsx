"use client";

import { ListeningDashboard } from "@/components/projects/listening/listening-dashboard";
import { useProjectRouteContext } from "@/hooks/use-project-route-context";

type ProjectOverviewPageProps = {
  workspaceIndexParam: string;
  projectIndexParam: string;
};

export function ProjectOverviewPage({
  workspaceIndexParam,
  projectIndexParam,
}: ProjectOverviewPageProps) {
  const { project } = useProjectRouteContext(
    workspaceIndexParam,
    projectIndexParam,
  );

  if (!project) {
    return null;
  }

  return <ListeningDashboard projectName={project.name} />;
}
