"use client";

import { SettingsIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { MentionFilterSelect } from "@/components/mentions/mention-filter-select";
import { GrowthChart } from "@/components/projects/demo/demo-charts";
import { DemoKeywordCloud } from "@/components/projects/demo/demo-keyword-cloud";
import { DemoGrid, DemoPanel, DemoTable } from "@/components/projects/demo/demo-ui";
import { ProjectSectionPage } from "@/components/projects/project-section-page";
import { Button } from "@/components/ui/button";
import { useProjectRouteContext } from "@/hooks/use-project-route-context";
import { getProjectNavHref } from "@/lib/dashboard/nav-items";
import { AQUA_PAGE_META, formatCount, getAquaCase } from "@/lib/projects/aqua-demo";
import type { ProjectCase } from "@/lib/projects/project-cases";
import { TOPIC_CONFIG } from "@/lib/topics/config";
import type { TopicReportItem } from "@/lib/topics/types";
import { hasMinWorkspacePermission } from "@/lib/workspaces/utils/permission-rank";

import { useTopicReport, type TopicsApiScope } from "./use-topics-api";

/** Topics report of real projects, laid out as the approved demo; demo projects keep the sample page. */
export function ProjectTopicsReportPage({
  workspaceIndexParam,
  projectIndexParam,
}: {
  workspaceIndexParam: string;
  projectIndexParam: string;
}) {
  const { workspace, project, workspaceIndex, projectIndex } = useProjectRouteContext(
    workspaceIndexParam,
    projectIndexParam,
  );

  if (!workspace || !project) return null;

  if (project.isDemo) {
    return (
      <ProjectSectionPage
        workspaceIndexParam={workspaceIndexParam}
        projectIndexParam={projectIndexParam}
        section="topics"
      />
    );
  }

  const topicsHref = getProjectNavHref(workspaceIndex, projectIndex, "topics");
  return (
    <TopicsReport
      scope={{ workspaceId: workspace.id, projectId: project.id }}
      projectName={project.name}
      projectCase={project.case}
      manageHref={
        hasMinWorkspacePermission(workspace.permission, "edit") ? `${topicsHref}/manage` : null
      }
      mentionsHref={getProjectNavHref(workspaceIndex, projectIndex, "mentions")}
    />
  );
}

function GrowthCell({ topic }: { topic: TopicReportItem }) {
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
  projectCase,
  manageHref,
  mentionsHref,
}: {
  scope: TopicsApiScope;
  projectName: string;
  projectCase: ProjectCase;
  manageHref: string | null;
  mentionsHref: string;
}) {
  const [days, setDays] = useState<number>(TOPIC_CONFIG.reportPeriodDays[0]);
  const { data, error, isPending, isFetching } = useTopicReport(scope, days);
  const sample = getAquaCase(projectCase);
  const items = data?.items ?? [];
  const growing = items.flatMap((topic) =>
    topic.growth === null
      ? []
      : [{ id: topic.id, name: topic.name, growth: topic.growth, negative: topic.negative }],
  );

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-4 py-5 md:px-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-bold tracking-tight">
            {AQUA_PAGE_META.topics.title}
          </h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            {projectName} · chủ đề gom tự động từ các mention có liên quan
            {isFetching && !isPending ? " · đang tải…" : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <MentionFilterSelect
            label="Khoảng thời gian"
            value={String(days)}
            options={TOPIC_CONFIG.reportPeriodDays.map((value) => ({
              value: String(value),
              label: `${value} ngày gần nhất`,
            }))}
            onChange={(value) => setDays(Number(value))}
          />
          {manageHref ? (
            <Button
              size="sm"
              variant="outline"
              nativeButton={false}
              render={<Link href={manageHref} />}
            >
              <SettingsIcon />
              Quản lý topic
            </Button>
          ) : null}
        </div>
      </div>
      {error ? <p className="text-sm text-destructive">{error.message}</p> : null}

      <DemoGrid>
        <DemoPanel
          title="Đám mây từ khóa"
          span="s5"
          scope="common"
          note="Dữ liệu mẫu: chưa trích xuất từ khóa từ mention. Cỡ chữ theo số đề cập, màu đỏ: tiêu cực chiếm đa số"
        >
          {sample ? (
            <DemoKeywordCloud data={sample} />
          ) : (
            <p className="text-sm text-muted-foreground">Chưa có từ khóa.</p>
          )}
        </DemoPanel>
        <DemoPanel
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
        </DemoPanel>
        <DemoPanel
          title="Danh sách chủ đề"
          span="s12"
          scope="common"
          note={`Chủ đề được AI tự động gom nhóm từ nội dung đề cập. Số đề cập và tỷ lệ cảm xúc tính trong ${days} ngày gần nhất. Bấm một chủ đề để xem các đề cập.`}
        >
          {items.length ? (
            <DemoTable
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
        </DemoPanel>
      </DemoGrid>
    </div>
  );
}
