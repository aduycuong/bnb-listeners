"use client";

import { useT } from "next-i18next/client";

import { ProjectAuthorsReport } from "@/components/metrics/project-authors-report";
import { ProjectAlertsPage } from "@/components/alerts/project-alerts-page";
import { BrandCaseReport } from "@/components/metrics/brand-case-report";
import { ProjectCaseReport } from "@/components/metrics/project-case-report";
import { ProjectChannelsReport } from "@/components/metrics/project-channels-report";
import { ProjectSentimentReport } from "@/components/metrics/project-sentiment-report";
import { ProjectPendingDashboard } from "@/components/projects/project-pending-dashboard";
import { ProjectReportPage } from "@/components/reports/project-report-page";
import { hasMinWorkspacePermission } from "@/lib/workspaces/utils/permission-rank";
import { CompareAuthorsReport } from "@/components/metrics/compare/compare-authors-report";
import { CompareCaseReport } from "@/components/metrics/compare/compare-case-report";
import { CompareChannelsReport } from "@/components/metrics/compare/compare-channels-report";
import { CompareSentimentReport } from "@/components/metrics/compare/compare-sentiment-report";
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
  const { t } = useT("dashboard");
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
    const compare = { scope, projectName: project.name, caseLabel: t(`cases.${project.case}`), banner };
    if (section === "sentiment") return <CompareSentimentReport {...compare} />;
    if (section === "channels") return <CompareChannelsReport {...compare} />;
    if (section === "authors") return <CompareAuthorsReport {...compare} />;
    if (section === "case") {
      return (
        <CompareCaseReport
          {...compare}
          projectCase={project.case}
          title={t(`caseNav.${project.case}`)}
        />
      );
    }
    return (
      <div className={projectReportPageClassName}>
        <ProjectPageBanner {...banner} />
        <MetricsEmpty>
          Project so sánh không có trang này; xem ở từng project được so sánh.
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
