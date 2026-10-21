"use client";

import Link from "next/link";
import { useT } from "next-i18next/client";
import { useState } from "react";

import {
  PriceBucketChart,
  PriceTrendChart,
  RadarAttributeChart,
} from "@/components/projects/demo/demo-charts";
import { DemoGrid, DemoPanel } from "@/components/projects/demo/demo-ui";
import {
  ProjectPageBanner,
  projectReportPageClassName,
  type ProjectPageBannerProps,
} from "@/components/projects/project-page-banner";
import { METRICS_CONFIG } from "@/lib/metrics/config";
import { formatCount } from "@/lib/projects/aqua-demo";

import { formatDayLabel, MetricsEmpty, MetricsPageHeader } from "./metrics-page-header";
import { useProjectCaseMetrics, type MetricsApiScope } from "./use-metrics-api";

function decimal(value: number) {
  return String(value).replace(".", ",");
}

/** Case page of a `project` listening case, laid out as the approved demo. */
export function ProjectCaseReport({
  scope,
  projectName,
  mentionsHref,
  banner,
}: {
  scope: MetricsApiScope;
  projectName: string;
  mentionsHref: string;
  banner: ProjectPageBannerProps;
}) {
  const { t } = useT("dashboard");
  const [days, setDays] = useState<number>(METRICS_CONFIG.reportPeriodDays[0]);
  const { data, error, isPending, isFetching } = useProjectCaseMetrics(scope, days);
  const loading = isPending ? "Đang tải…" : null;
  const caseLabel = t("cases.project");
  const priceSeries = data
    ? [
        {
          key: data.primaryName,
          color: "#0091FF",
          dotted: true,
          values: data.price.daily.map((day) => day.primary),
        },
        ...(data.hasCompetitors
          ? [
              {
                key: "TB đối thủ",
                color: "#FFC93C",
                values: data.price.daily.map((day) => day.competitor),
              },
            ]
          : []),
        ...(data.price.priceRef != null
          ? [
              {
                key: "Giá khởi điểm CĐT",
                color: "var(--muted-foreground)",
                dashed: true,
                values: data.price.daily.map(() => data.price.priceRef),
              },
            ]
          : []),
      ]
    : [];
  const hasPriceLine = data?.price.daily.some((day) => day.primary != null || day.competitor != null) ?? false;
  const radarAspects = data?.aspects.filter((aspect) => aspect.primary != null || aspect.competitor != null) ?? [];
  const radarSeries = data
    ? [
        {
          key: data.primaryName,
          color: "#0091FF",
          values: radarAspects.map((aspect) => aspect.primary ?? 0),
        },
        ...(data.hasCompetitors && radarAspects.some((aspect) => aspect.competitor != null)
          ? [
              {
                key: "TB đối thủ",
                color: "#FFC93C",
                values: radarAspects.map((aspect) => aspect.competitor ?? 0),
              },
            ]
          : []),
      ]
    : [];

  const medianNote = data
    ? [
        data.price.median.current != null
          ? `Trung vị kỳ này ${decimal(data.price.median.current)} tr/m²`
          : null,
        data.price.median.previous != null
          ? `kỳ trước ${decimal(data.price.median.previous)}`
          : "chưa có kỳ trước",
        data.price.priceRef != null ? `giá khởi điểm ${decimal(data.price.priceRef)}` : null,
        data.price.droppedMultiEntity || data.price.droppedOutlier
          ? `đã bỏ ${formatCount(data.price.droppedMultiEntity + data.price.droppedOutlier)} tin (nhiều đối tượng hoặc lệch mạnh)`
          : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : undefined;

  return (
    <div className={projectReportPageClassName}>
      <MetricsPageHeader
        title={t("caseNav.project")}
        subtitle={`${projectName} · trang chỉ có ở kiểu case “${caseLabel}”`}
        days={days}
        onDaysChange={setDays}
        loading={isFetching && !isPending}
      />
      <ProjectPageBanner {...banner} />
      {error ? <p className="text-sm text-destructive">{error.message}</p> : null}

      <DemoGrid>
        <DemoPanel
          title="Giá rao bán lại theo ngày"
          span="s8"
          scope="case"
          scopeLabel={caseLabel}
          note={
            medianNote ||
            "Triệu đồng/m², AI trích xuất từ tin rao, đã lọc trùng và tin bất thường"
          }
        >
          {data && hasPriceLine ? (
            <PriceTrendChart
              days={data.price.daily.map((day) => formatDayLabel(day.date))}
              series={priceSeries}
            />
          ) : (
            <MetricsEmpty>
              {loading ?? `Chưa có giá rao bán (triệu/m²) gán được cho một đối tượng trong ${days} ngày gần nhất.`}
            </MetricsEmpty>
          )}
        </DemoPanel>
        <DemoPanel
          title="Phân bố giá rao"
          span="s4"
          scope="case"
          scopeLabel={caseLabel}
          note={
            data?.price.used
              ? `${formatCount(data.price.used)} tin rao trong ${days} ngày`
              : undefined
          }
        >
          {data?.price.buckets.length ? (
            <PriceBucketChart
              buckets={data.price.buckets.map((bucket) => ({
                name: bucket.label,
                value: bucket.count,
              }))}
            />
          ) : (
            <MetricsEmpty>{loading ?? "Chưa có tin rao để vẽ phân bố."}</MetricsEmpty>
          )}
        </DemoPanel>
        <DemoPanel
          title="Câu hỏi thường gặp của người mua"
          span="s6"
          scope="case"
          scopeLabel={caseLabel}
          note={
            data
              ? data.questions.total
                ? `AI gom nhóm từ ${formatCount(data.questions.total)} câu hỏi`
                : "Chưa có câu hỏi người mua trong kỳ"
              : undefined
          }
        >
          {data?.questions.items.length ? (
            <div className="flex flex-col">
              {data.questions.items.map((question) => (
                <Link
                  key={question.id}
                  href={`${mentionsHref}?topicId=${question.id}`}
                  className="grid grid-cols-[minmax(0,1fr)_auto] gap-2.5 border-b border-border py-2.5 text-[13px] last:border-0 hover:text-primary"
                >
                  <span className="min-w-0">
                    {question.name}
                    <small className="mt-0.5 block text-muted-foreground">
                      Chưa có câu trả lời chính thức
                    </small>
                  </span>
                  <b className="self-center font-semibold tabular-nums">
                    {formatCount(question.mentions)} lượt
                  </b>
                </Link>
              ))}
            </div>
          ) : (
            <MetricsEmpty>
              {loading ??
                "Chưa có nhóm câu hỏi. Gom câu hỏi người mua (`buyer_question`) để có danh sách."}
            </MetricsEmpty>
          )}
        </DemoPanel>
        <DemoPanel
          title="So sánh khía cạnh với dự án cạnh tranh"
          span="s6"
          scope="case"
          scopeLabel={caseLabel}
          note="Điểm cảm xúc ròng theo khía cạnh. Đối thủ chỉ tính mention nói đúng một đối thủ."
        >
          {data && radarAspects.length ? (
            <RadarAttributeChart
              labels={radarAspects.map((aspect) => aspect.name)}
              series={radarSeries}
            />
          ) : (
            <MetricsEmpty>
              {loading ?? "Chưa có khía cạnh đã phân loại cảm xúc trong kỳ."}
            </MetricsEmpty>
          )}
        </DemoPanel>
      </DemoGrid>
    </div>
  );
}
