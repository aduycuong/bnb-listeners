"use client";

import { SettingsIcon } from "lucide-react";
import Link from "next/link";
import { useT } from "next-i18next/client";

import { CompareTopicsReport } from "@/components/metrics/compare/compare-topics-report";
import { MetricsPageHeader } from "@/components/metrics/metrics-page-header";
import { useReports } from "@/components/metrics/use-metrics-api";
import { useReportPeriodDays } from "@/components/metrics/use-report-period-days";
import { GrowthChart } from "@/components/metrics/report-ui/report-charts";
import { KeywordCloud } from "@/components/metrics/report-ui/keyword-cloud";
import { ReportGrid, ReportPanel, ReportTable } from "@/components/metrics/report-ui/report-ui";
import {
  ProjectPageBanner,
  projectReportPageClassName,
  type ProjectPageBannerProps,
} from "@/components/projects/project-page-banner";
import { Button } from "@/components/ui/button";
import { useProjectRouteContext } from "@/hooks/use-project-route-context";
import { getProjectNavHref } from "@/lib/dashboard/nav-items";
import { AQUA_PAGE_META, formatCount } from "@/lib/projects/aqua-demo";
import { isCompareCase } from "@/lib/projects/project-cases";
import type { TopicsReportItem } from "@/lib/metrics/types";
import { hasMinWorkspacePermission } from "@/lib/workspaces/utils/permission-rank";

import type { TopicsApiScope } from "./use-topics-api";

const REPORTS = [{ key: "topics" }, { key: "keywords" }] as const;

/** Topics report for a project. */
export function ProjectTopicsReportPage({
  workspaceIndexParam,
  projectIndexParam,
}: {
  workspaceIndexParam: string;
  projectIndexParam: string;
}) {
  const { t } = useT("dashboard");
  const { workspace, project, workspaceIndex, projectIndex } = useProjectRouteContext(
    workspaceIndexParam,
    projectIndexParam,
  );

  if (!workspace || !project) return null;

  const scope = { workspaceId: workspace.id, projectId: project.id };
  const banner = {
    name: project.name,
    description: project.description,
    projectCase: project.case,
    settingsHref: getProjectNavHref(workspaceIndex, projectIndex, "settings"),
  };
  if (isCompareCase(project.case)) {
    return (
      <CompareTopicsReport
        scope={scope}
        projectName={project.name}
        caseLabel={t(`cases.${project.case}`)}
        banner={banner}
      />
    );
  }

  const topicsHref = getProjectNavHref(workspaceIndex, projectIndex, "topics");
  return (
    <TopicsReport
      scope={scope}
      projectName={project.name}
      manageHref={
        hasMinWorkspacePermission(workspace.permission, "edit") ? `${topicsHref}/manage` : null
      }
      mentionsHref={getProjectNavHref(workspaceIndex, projectIndex, "mentions")}
      banner={banner}
    />
  );
}

function GrowthCell({ topic }: { topic: TopicsReportItem }) {
  if (topic.growth === null) {
    return (
      <span className="text-muted-foreground">{topic.mentions > 0 ? "mới" : "—"}</span>
    );
  }
  return (
    <span
      className={topic.growth >= 0 ? "font-semibold text-[#0B8A6B]" : "font-semibold text-[#D5402F]"}
    >
      {topic.growth >= 0 ? "▲" : "▼"} {Math.abs(topic.growth)}%
    </span>
  );
}

function TopicsReport({
  scope,
  projectName,
  manageHref,
  mentionsHref,
  banner,
}: {
  scope: TopicsApiScope;
  projectName: string;
  manageHref: string | null;
  mentionsHref: string;
  banner: ProjectPageBannerProps;
}) {
  const [days, setDays] = useReportPeriodDays();
  const { data, error, isPending, isFetching } = useReports(scope, days, REPORTS);
  const [topics, keywordReport] = data?.reports ?? [];
  const items = topics?.data ?? [];
  const keywords = (keywordReport?.data ?? []).map((keyword) => ({
    key: keyword.keyword,
    name: keyword.text,
    mentions: keyword.mentions,
    negative: keyword.negative,
  }));
  const growing = items.flatMap((topic) =>
    topic.growth === null
      ? []
      : [{ id: topic.id, name: topic.name, growth: topic.growth, negative: topic.negative }],
  );

  return (
    <div className={projectReportPageClassName}>
      <MetricsPageHeader
        title={AQUA_PAGE_META.topics.title}
        subtitle={`${projectName} · chủ đề gom tự động từ các mention có liên quan`}
        days={days}
        onDaysChange={setDays}
        loading={isFetching && !isPending}
        actions={
          manageHref ? (
            <Button
              size="sm"
              variant="outline"
              nativeButton={false}
              render={<Link href={manageHref} />}
            >
              <SettingsIcon />
              Quản lý topic
            </Button>
          ) : null
        }
      />
      <ProjectPageBanner {...banner} />
      {error ? <p className="text-sm text-destructive">{error.message}</p> : null}

      <ReportGrid>
        <ReportPanel
          title="Đám mây từ khóa"
          span="s5"
          scope="common"
          note="Từ khóa Enrich trích từ các mention trong kỳ. Cỡ chữ theo số đề cập, màu đỏ: tiêu cực chiếm đa số"
        >
          {keywords.length > 0 ? (
            <KeywordCloud words={keywords} />
          ) : (
            <p className="text-sm text-muted-foreground">
              {isPending ? "Đang tải…" : "Chưa có từ khóa trong kỳ này."}
            </p>
          )}
        </ReportPanel>
        <ReportPanel
          title="Tăng trưởng chủ đề"
          span="s7"
          scope="common"
          note={`${days} ngày gần nhất so với ${days} ngày trước đó`}
        >
          {growing.length ? (
            <GrowthChart topics={growing} labelWidth={230} maxLabelLength={30} />
          ) : (
            <p className="rounded-xl bg-muted px-3 py-6 text-center text-sm text-muted-foreground">
              {isPending
                ? "Đang tải…"
                : `Chưa đủ dữ liệu để so sánh: cần mention của ${days} ngày trước đó.`}
            </p>
          )}
        </ReportPanel>
        <ReportPanel
          title="Danh sách chủ đề"
          span="s12"
          scope="common"
          note={`Chủ đề được AI tự động gom nhóm từ nội dung đề cập. Số đề cập và tỷ lệ cảm xúc tính trong ${days} ngày gần nhất. Bấm một chủ đề để xem các đề cập.`}
        >
          {items.length ? (
            <ReportTable
              headers={[
                { label: "Chủ đề" },
                { label: "Đề cập", numeric: true },
                { label: "Tăng trưởng", numeric: true },
                { label: "Tích cực", numeric: true },
                { label: "Tiêu cực", numeric: true },
              ]}
              rows={items.map((topic) => [
                <Link
                  key="name"
                  href={`${mentionsHref}?topicId=${topic.id}`}
                  className="font-medium hover:text-primary hover:underline"
                >
                  {topic.name}
                </Link>,
                formatCount(topic.mentions),
                <GrowthCell key="growth" topic={topic} />,
                `${topic.positive}%`,
                <span
                  key="negative"
                  className={topic.negative >= 40 ? "font-semibold text-[#D5402F]" : undefined}
                >
                  {topic.negative}%
                </span>,
              ])}
            />
          ) : (
            <p className="rounded-xl bg-muted px-3 py-6 text-center text-sm text-muted-foreground">
              {isPending
                ? "Đang tải…"
                : `Không có topic nào có đề cập trong ${days * 2} ngày gần nhất. Topic được tạo sau khi làm giàu mention, khi đủ mention cùng bàn một chuyện.`}
            </p>
          )}
        </ReportPanel>
      </ReportGrid>
    </div>
  );
}
