"use client";

import { ProjectAuthorsReport } from "@/components/metrics/project-authors-report";
import { ProjectChannelsReport } from "@/components/metrics/project-channels-report";
import { ProjectSentimentReport } from "@/components/metrics/project-sentiment-report";
import { AquaDemoDashboard } from "@/components/projects/demo/demo-dashboard";
import { ProjectPendingDashboard } from "@/components/projects/project-pending-dashboard";
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
  const { workspace, project, workspaceIndex, projectIndex } = useProjectRouteContext(
    workspaceIndexParam,
    projectIndexParam,
  );

  if (!workspace || !project) {
    return null;
  }

  if (!project.isDemo) {
    const scope = { workspaceId: workspace.id, projectId: project.id };
    const mentionsHref = getProjectNavHref(workspaceIndex, projectIndex, "mentions");
    if (section === "sentiment") {
      return <ProjectSentimentReport scope={scope} projectName={project.name} />;
    }
    if (section === "channels") {
      return (
        <ProjectChannelsReport scope={scope} projectName={project.name} mentionsHref={mentionsHref} />
      );
    }
    if (section === "authors") {
      return (
        <ProjectAuthorsReport scope={scope} projectName={project.name} mentionsHref={mentionsHref} />
      );
    }
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
      section={section}
      settingsHref={getProjectNavHref(workspaceIndex, projectIndex, "settings")}
    />
  );
}
