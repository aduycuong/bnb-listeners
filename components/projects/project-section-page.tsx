"use client";

import { ProjectAuthorsReport } from "@/components/metrics/project-authors-report";
import { ProjectCaseReport } from "@/components/metrics/project-case-report";
import { ProjectChannelsReport } from "@/components/metrics/project-channels-report";
import { ProjectSentimentReport } from "@/components/metrics/project-sentiment-report";
import { ProjectPendingDashboard } from "@/components/projects/project-pending-dashboard";
import type { ProjectPageBannerProps } from "@/components/projects/project-page-banner";
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

  const scope = { workspaceId: workspace.id, projectId: project.id };
  const mentionsHref = getProjectNavHref(workspaceIndex, projectIndex, "mentions");
  const banner: ProjectPageBannerProps = {
    name: project.name,
    description: project.description,
    projectCase: project.case,
    settingsHref: getProjectNavHref(workspaceIndex, projectIndex, "settings"),
  };
  if (section === "sentiment") {
    return <ProjectSentimentReport scope={scope} projectName={project.name} banner={banner} />;
  }
  if (section === "channels") {
    return (
      <ProjectChannelsReport
        scope={scope}
        projectName={project.name}
        mentionsHref={mentionsHref}
        banner={banner}
      />
    );
  }
  if (section === "authors") {
    return (
      <ProjectAuthorsReport
        scope={scope}
        projectName={project.name}
        mentionsHref={mentionsHref}
        banner={banner}
      />
    );
  }
  if (section === "case" && project.case === "project") {
    return (
      <ProjectCaseReport
        scope={scope}
        projectName={project.name}
        mentionsHref={mentionsHref}
        banner={banner}
      />
    );
  }

  return (
    <ProjectPendingDashboard
      project={project}
      settingsHref={getProjectNavHref(workspaceIndex, projectIndex, "settings")}
    />
  );
}
