"use client";


import { AspectChart, EmotionChart, NssChart } from "@/components/metrics/report-ui/report-charts";
import { ReportGrid, ReportPanel } from "@/components/metrics/report-ui/report-ui";
import {
  ProjectPageBanner,
  projectReportPageClassName,
  type ProjectPageBannerProps,
} from "@/components/projects/project-page-banner";
import { AQUA_PAGE_META, formatCount } from "@/lib/projects/aqua-demo";

import { formatDayLabel, MetricsEmpty, MetricsPageHeader } from "./metrics-page-header";
import { useSentimentMetrics, type MetricsApiScope } from "./use-metrics-api";
import { useReportPeriodDays } from "./use-report-period-days";

/** Sentiment page of real projects, laid out as the approved demo (phase 5b). */
export function ProjectSentimentReport({
  scope,
  projectName,
  banner,
}: {
  scope: MetricsApiScope;
  projectName: string;
  banner: ProjectPageBannerProps;
}) {
  const [days, setDays] = useReportPeriodDays();
  const { data, error, isPending, isFetching } = useSentimentMetrics(scope, days);
  const hasNss = data?.daily.some((day) => day.nss !== null) ?? false;
  const emotionTotal = data?.emotions.reduce((total, item) => total + item.mentions, 0) ?? 0;
  const aspects = data?.aspects.filter((aspect) => aspect.mentions > 0) ?? [];
  const loading = isPending ? "Đang tải…" : null;

  return (
    <div className={projectReportPageClassName}>
      <MetricsPageHeader
        title={AQUA_PAGE_META.sentiment.title}
        subtitle={`${projectName} · cảm xúc của các đề cập có liên quan`}
        days={days}
        onDaysChange={setDays}
        loading={isFetching && !isPending}
      />
      <ProjectPageBanner {...banner} />
      {error ? <p className="text-sm text-destructive">{error.message}</p> : null}

      <ReportGrid>
        <ReportPanel
          title="Chỉ số cảm xúc (NSS) theo ngày"
          span="s8"
          scope="common"
          note="Dưới 0: tiêu cực chiếm ưu thế. Ngày không có đề cập đã phân loại cảm xúc để trống."
        >
          {data && hasNss ? (
            <NssChart
              days={data.daily.map((day) => formatDayLabel(day.date))}
              values={data.daily.map((day) => day.nss)}
            />
          ) : (
            <MetricsEmpty>{loading ?? `Chưa có đề cập đã phân loại cảm xúc trong ${days} ngày gần nhất.`}</MetricsEmpty>
          )}
        </ReportPanel>
        <ReportPanel
          title="Cảm xúc chi tiết"
          span="s4"
          scope="common"
          note={`Phân loại cảm xúc bằng AI · ${formatCount(emotionTotal)} đề cập có cảm xúc`}
        >
          {data && emotionTotal > 0 ? (
            <EmotionChart values={data.emotions.map((item) => item.share)} />
          ) : (
            <MetricsEmpty>{loading ?? "Chưa có đề cập có cảm xúc trong kỳ."}</MetricsEmpty>
          )}
        </ReportPanel>
        <ReportPanel
          title="Cảm xúc theo khía cạnh"
          span="s12"
          scope="common"
          note="Tỷ lệ tích cực (phải) và tiêu cực (trái) trong các đề cập nhắc đến từng khía cạnh. Khía cạnh không có đề cập trong kỳ được ẩn."
        >
          {aspects.length ? (
            <>
              <AspectChart names={aspects.map((aspect) => aspect.name)} aspects={aspects} />
              <p className="mt-2 text-xs text-muted-foreground">
                Số đề cập:{" "}
                {aspects.map((aspect) => `${aspect.name} ${formatCount(aspect.mentions)}`).join(" · ")}
              </p>
            </>
          ) : (
            <MetricsEmpty>{loading ?? "Chưa có đề cập nhắc tới khía cạnh nào trong kỳ."}</MetricsEmpty>
          )}
        </ReportPanel>
      </ReportGrid>
    </div>
  );
}
