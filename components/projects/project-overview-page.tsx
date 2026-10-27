"use client";

import { CompareOverviewReport } from "@/components/metrics/compare/compare-overview-report";
import { ProjectOverviewReport } from "@/components/metrics/project-overview-report";
import { useProjectRouteContext } from "@/hooks/use-project-route-context";
import { getProjectNavHref } from "@/lib/dashboard/nav-items";
import { isCompareCase } from "@/lib/projects/project-cases";

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

  const banner = {
    name: project.name,
    description: project.description,
    projectCase: project.case,
    settingsHref: getProjectNavHref(workspaceIndex, projectIndex, "settings"),
  };
  const scope = { workspaceId: workspace.id, projectId: project.id };

  if (isCompareCase(project.case)) {
    return (
      <CompareOverviewReport
        scope={scope}
        projectName={project.name}
        projectCase={project.case}
        banner={banner}
      />
    );
  }

  return (
    <ProjectOverviewReport
      scope={scope}
      projectName={project.name}
      projectCase={project.case}
      caseHref={getProjectNavHref(workspaceIndex, projectIndex, "case")}
      reportHref={getProjectNavHref(workspaceIndex, projectIndex, "report")}
      banner={banner}
      mentionsHref={getProjectNavHref(workspaceIndex, projectIndex, "mentions")}
    />
  );
}
