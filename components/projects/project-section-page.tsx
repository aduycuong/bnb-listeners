"use client";

import { ProjectAuthorsReport } from "@/components/metrics/project-authors-report";
import { ProjectAlertsPage } from "@/components/alerts/project-alerts-page";
import { BrandCaseReport } from "@/components/metrics/brand-case-report";
import { ProjectCaseReport } from "@/components/metrics/project-case-report";
import { ProjectChannelsReport } from "@/components/metrics/project-channels-report";
import { ProjectSentimentReport } from "@/components/metrics/project-sentiment-report";
import { ProjectPendingDashboard } from "@/components/projects/project-pending-dashboard";
import { ProjectReportPage } from "@/components/reports/project-report-page";
import { hasMinWorkspacePermission } from "@/lib/workspaces/utils/permission-rank";
import { MetricsEmpty } from "@/components/metrics/metrics-page-header";
import {
  ProjectPageBanner,
  projectReportPageClassName,
  type ProjectPageBannerProps,
} from "@/components/projects/project-page-banner";
import { useProjectRouteContext } from "@/hooks/use-project-route-context";
import { getProjectNavHref } from "@/lib/dashboard/nav-items";
import { isCompareCase } from "@/lib/projects/project-cases";

type ProjectSectionPageProps = {
  workspaceIndexParam: string;
  projectIndexParam: string;
  section: string;
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
  if (isCompareCase(project.case)) {
    return (
      <div className={projectReportPageClassName}>
        <ProjectPageBanner {...banner} />
        <MetricsEmpty>
          Project so sánh chỉ có trang Tổng quan; số liệu chi tiết xem ở từng project được so sánh.
        </MetricsEmpty>
      </div>
    );
  }
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
  if (section === "case" && project.case === "brand") {
    return <BrandCaseReport scope={scope} projectName={project.name} banner={banner} />;
  }
  if (section === "report") {
    return (
      <ProjectReportPage
        scope={scope}
        projectName={project.name}
        banner={banner}
        canGenerate={hasMinWorkspacePermission(workspace.permission, "edit")}
      />
    );
  }
  if (section === "alerts") {
    return (
      <ProjectAlertsPage
        scope={scope}
        projectName={project.name}
        banner={banner}
        settingsHref={getProjectNavHref(workspaceIndex, projectIndex, "settings")}
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
