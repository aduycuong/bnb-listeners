"use client";

import Link from "next/link";
import { useState } from "react";

import { DonutChart, TrendChart } from "@/components/projects/demo/demo-charts";
import { DemoBars, DemoGrid, DemoKpis, DemoPanel } from "@/components/projects/demo/demo-ui";
import {
  ProjectPageBanner,
  projectReportPageClassName,
  type ProjectPageBannerProps,
} from "@/components/projects/project-page-banner";
import { METRICS_CONFIG } from "@/lib/metrics/config";
import { growthPercent } from "@/lib/metrics/formulas";
import type { MetricsValue, OverviewMetricsResult } from "@/lib/metrics/types";
import {
  AQUA_PAGE_META,
  formatCount,
  formatShort,
  formatSigned,
  type AquaKpi,
} from "@/lib/projects/aqua-demo";

import { formatDayLabel, MetricsEmpty, MetricsPageHeader } from "./metrics-page-header";
import { useOverviewMetrics, type MetricsApiScope } from "./use-metrics-api";

const GLOSSARY = [
  ["Lượt đề cập (Mentions)", "Số bài đăng, bình luận và trả lời có liên quan tới đối tượng đang theo dõi."],
  ["Tương tác (Engagement)", "Tổng lượt thích, bình luận (trả lời, với bình luận) và chia sẻ của chính nội dung đề cập."],
  ["Tác giả", "Số người khác nhau đã viết các đề cập trong kỳ."],
  ["Chỉ số cảm xúc ròng (NSS)", "(Tích cực − Tiêu cực) / Số đề cập đã phân loại cảm xúc × 100, từ −100 đến +100."],
  ["Share of Voice (SOV)", "Tỷ lệ đề cập nhắc tới đối tượng chính trên đề cập nhắc tới đối tượng chính hoặc đối thủ. Chỉ có khi project có đối thủ."],
  ["Kỳ so sánh", "Các thay đổi so với cùng số ngày liền trước, tính theo ngày đăng và múi giờ của project."],
];

function decimal(value: number | string) {
  return String(value).replace(".", ",");
}

/** Change in % for counts; "Chưa có kỳ trước" when the period before is empty. */
function countKpi(
  label: string,
  value: MetricsValue,
  tip: string,
  format: (value: number) => string = formatCount,
): AquaKpi {
  const growth = growthPercent(value.current, value.previous);
  return {
    label,
    value: format(value.current),
    delta: growth === null ? "Chưa có kỳ trước" : `${decimal(formatSigned(growth))}%`,
    good: growth === null || growth >= 0,
    tip,
  };
}

/** Change in points for scores and shares; `higherIsBetter` colours the change. */
function pointKpi(
  label: string,
  value: MetricsValue<number | null>,
  tip: string,
  { suffix = "", higherIsBetter = true, signed = false } = {},
): AquaKpi {
  const show = (number: number) => decimal(signed ? formatSigned(number) : number) + suffix;
  const change =
    value.current === null || value.previous === null
      ? null
      : Math.round((value.current - value.previous) * 10) / 10;
  return {
    label,
    value: value.current === null ? "—" : show(value.current),
    delta:
      change === null
        ? "Chưa có kỳ trước"
        : `${decimal(formatSigned(change))} điểm`,
    good: change === null || (higherIsBetter ? change >= 0 : change <= 0),
    tip,
  };
}

function buildKpis(data: OverviewMetricsResult): AquaKpi[] {
  const kpis = [
    countKpi("Lượt đề cập", data.mentions, "Bài đăng, bình luận, trả lời có liên quan"),
    countKpi("Tương tác", data.engagement, "Tổng lượt thích, bình luận, chia sẻ", formatShort),
    countKpi("Tác giả", data.uniqueAuthors, "Số người khác nhau viết đề cập"),
    pointKpi("Chỉ số cảm xúc (NSS)", data.nss, "(Tích cực − Tiêu cực) / Tổng đề cập đã phân loại × 100", {
      signed: true,
    }),
  ];
  // Always six tiles as in the demo, so every KPI keeps its colour.
  kpis.push(
    data.shareOfVoice
      ? pointKpi("Share of Voice", data.shareOfVoice, "Tỷ lệ đề cập của đối tượng chính so với đối thủ", {
          suffix: "%",
        })
      : {
          label: "Share of Voice",
          value: "—",
          delta: "Chưa có đối thủ",
          good: true,
          tip: "Thêm đối thủ trong cấu hình project để so sánh",
        },
  );
  kpis.push(
    pointKpi("Tỷ lệ tiêu cực", data.negativeShare, "Phần trăm đề cập tiêu cực trên tổng đề cập đã phân loại", {
      suffix: "%",
      higherIsBetter: false,
    }),
  );
  return kpis;
}

/** Overview page of real projects, laid out as the approved demo (phase 5b). */
export function ProjectOverviewReport({
  scope,
  projectName,
  banner,
  mentionsHref,
}: {
  scope: MetricsApiScope;
  projectName: string;
  banner: ProjectPageBannerProps;
  mentionsHref: string;
}) {
  const [days, setDays] = useState<number>(METRICS_CONFIG.reportPeriodDays[0]);
  const { data, error, isPending, isFetching } = useOverviewMetrics(scope, days);
  const hasMentions = (data?.mentions.current ?? 0) > 0;
  const sentimentTotal = data
    ? data.sentiment.positive + data.sentiment.neutral + data.sentiment.negative
    : 0;

  return (
    <div className={projectReportPageClassName}>
      <MetricsPageHeader
        title={AQUA_PAGE_META.overview.title}
        subtitle={`${projectName} · số liệu từ các đề cập có liên quan`}
        days={days}
        onDaysChange={setDays}
        loading={isFetching && !isPending}
      />
      <ProjectPageBanner {...banner} />
      {error ? <p className="text-sm text-destructive">{error.message}</p> : null}
      {data ? <DemoKpis kpis={buildKpis(data)} compareLabel={`vs ${days} ngày trước`} /> : null}

      <DemoGrid>
        <DemoPanel
          title="Lượt đề cập theo ngày và cảm xúc"
          span="s8"
          scope="common"
          note={
            data?.sentiment.unknown
              ? `${formatCount(data.sentiment.unknown)} đề cập chưa phân loại cảm xúc không có trong biểu đồ`
              : undefined
          }
        >
          {data && hasMentions ? (
            <TrendChart
              brands={null}
              days={data.daily.map((day) => formatDayLabel(day.date))}
              trend={{
                pos: data.daily.map((day) => day.positive),
                neu: data.daily.map((day) => day.neutral),
                neg: data.daily.map((day) => day.negative),
              }}
            />
          ) : (
            <MetricsEmpty>{isPending ? "Đang tải…" : `Chưa có đề cập trong ${days} ngày gần nhất.`}</MetricsEmpty>
          )}
        </DemoPanel>
        <DemoPanel title="Phân bổ cảm xúc" span="s4" scope="common">
          {data && sentimentTotal > 0 ? (
            <>
              <DonutChart
                data={[
                  { name: "Tích cực", value: data.sentiment.positive },
                  { name: "Trung lập", value: data.sentiment.neutral },
                  { name: "Tiêu cực", value: data.sentiment.negative },
                ]}
                colors={["var(--pos)", "var(--neu)", "var(--neg)"]}
              />
              <div className="mt-3 grid grid-cols-2 gap-2.5">
                <div className="rounded-[10px] bg-muted px-3 py-2 text-xs text-muted-foreground">
                  NSS
                  <b className="mt-0.5 block text-[17px] text-foreground">
                    {data.nss.current === null ? "—" : formatSigned(data.nss.current)}
                  </b>
                </div>
                <div className="rounded-[10px] bg-muted px-3 py-2 text-xs text-muted-foreground">
                  Tiêu cực
                  <b className="mt-0.5 block text-[17px] text-foreground">
                    {data.negativeShare.current === null
                      ? "—"
                      : `${decimal(data.negativeShare.current)}%`}
                  </b>
                </div>
              </div>
            </>
          ) : (
            <MetricsEmpty>{isPending ? "Đang tải…" : "Chưa có đề cập đã phân loại cảm xúc."}</MetricsEmpty>
          )}
        </DemoPanel>
        <DemoPanel
          title="Kênh thảo luận"
          span="s6"
          scope="common"
          note="Theo nguồn (group, page) có nhiều đề cập nhất trong kỳ"
        >
          {data?.sources.length ? (
            <DemoBars
              rows={data.sources.map((source) => ({
                label: source.name,
                value: source.mentions,
                display: formatCount(source.mentions),
              }))}
            />
          ) : (
            <MetricsEmpty>{isPending ? "Đang tải…" : "Chưa có đề cập trong kỳ."}</MetricsEmpty>
          )}
        </DemoPanel>
        <DemoPanel
          title="Chủ đề nổi bật"
          span="s6"
          scope="common"
          note="Chủ đề có nhiều đề cập nhất trong kỳ. Bấm để xem đề cập."
        >
          {data?.topics.length ? (
            <div className="flex flex-col gap-2.5">
              {data.topics.map((topic) => (
                <Link
                  key={topic.id}
                  href={`${mentionsHref}?topicId=${topic.id}`}
                  className="grid grid-cols-[minmax(0,1fr)_minmax(80px,30%)_48px] items-center gap-2.5 text-[13px] hover:text-primary"
                >
                  <span className="truncate" title={topic.name}>
                    {topic.name}
                  </span>
                  <span className="h-[9px] overflow-hidden rounded-full bg-muted">
                    <i
                      className="block h-full rounded-full bg-primary"
                      style={{ width: `${(topic.mentions / (data.topics[0]?.mentions || 1)) * 100}%` }}
                    />
                  </span>
                  <b className="text-right font-semibold">{formatCount(topic.mentions)}</b>
                </Link>
              ))}
            </div>
          ) : (
            <MetricsEmpty>{isPending ? "Đang tải…" : "Chưa có chủ đề có đề cập trong kỳ."}</MetricsEmpty>
          )}
        </DemoPanel>
      </DemoGrid>
      <details className="rounded-[22px] border-[1.5px] border-border bg-card px-[18px] py-3.5">
        <summary className="cursor-pointer text-sm font-semibold">Định nghĩa các chỉ số</summary>
        <div className="mt-3.5 grid gap-3.5 md:grid-cols-3">
          {GLOSSARY.map(([title, body]) => (
            <div key={title} className="text-[13px] text-muted-foreground">
              <b className="mb-0.5 block text-[13.5px] text-foreground">{title}</b>
              {body}
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
