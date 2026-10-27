"use client";

import Link from "next/link";
import { useT } from "next-i18next/client";

import { DonutChart, TrendChart } from "@/components/metrics/report-ui/report-charts";
import { ReportBars, ReportGrid, ReportKpis, ReportPanel } from "@/components/metrics/report-ui/report-ui";
import {
  ProjectPageBanner,
  projectReportPageClassName,
  type ProjectPageBannerProps,
} from "@/components/projects/project-page-banner";
import { growthPercent } from "@/lib/metrics/formulas";
import type {
  MetricsValue,
  OverviewMetricsResult,
  ProjectCaseMetricsResult,
} from "@/lib/metrics/types";
import type { ProjectCase } from "@/lib/projects/project-cases";
import {
  AQUA_PAGE_META,
  formatCount,
  formatShort,
  formatSigned,
  type AquaKpi,
} from "@/lib/projects/aqua-demo";

import { BrandCasePanels } from "./brand-case-panels";
import { formatDayLabel, MetricsEmpty, MetricsPageHeader } from "./metrics-page-header";
import { OverviewAiSummary } from "./overview-ai-summary";
import { buildKpis, countKpi, decimal, pointKpi } from "./overview-kpis";
import { ProjectPricePanels } from "./project-price-panels";
import {
  useBrandCaseMetrics,
  useOverviewMetrics,
  useProjectCaseMetrics,
  type MetricsApiScope,
} from "./use-metrics-api";
import { useReportPeriodDays } from "./use-report-period-days";

const GLOSSARY = [
  ["Lượt đề cập (Mentions)", "Số bài đăng, bình luận và trả lời được xác định nói về đối tượng project đang theo dõi."],
  ["Tương tác (Engagement)", "Tổng lượt thích, bình luận (trả lời, với bình luận) và chia sẻ của chính nội dung đề cập."],
  ["Tác giả", "Số người khác nhau đã viết các đề cập trong kỳ."],
  ["Chỉ số cảm xúc ròng (NSS)", "(Tích cực − Tiêu cực) / Số đề cập đã phân loại cảm xúc × 100, từ −100 đến +100."],
  ["Kỳ so sánh", "Các thay đổi so với cùng số ngày liền trước, tính theo ngày đăng và múi giờ của project."],
  ["Giá rao (tr/m²)", "Trung vị giá rao bán lại của dự án đang theo dõi, triệu đồng/m². AI trích từ tin rao; đã lọc tin trùng và tin lệch bất thường."],
  ["Chỉ số uy tín (0–100)", "Trung bình điểm các trụ cột (khía cạnh) có ít nhất 5 đề cập có cảm xúc. Điểm trụ cột = (NSS của khía cạnh + 100) / 2. Chỉ tính đề cập AI xác định nói về chủ đầu tư hoặc dự án của chủ đầu tư."],
  ["Câu hỏi của người mua", "Số câu hỏi AI trích từ mention của người đang cân nhắc mua hoặc thuê."],
  ["Dùng chung / Riêng case", "Nhãn ở góc mỗi khung cho biết khung đó có trong mọi case hay chỉ có ở case đang chọn."],
];

const PRICE_TIP =
  "Trung vị giá rao bán lại của dự án đang theo dõi, triệu đồng/m². Đã lọc tin trùng và tin lệch.";
const QUESTION_TIP = "Câu hỏi AI trích từ người đang cân nhắc mua hoặc thuê";

/** Two case tiles. Shown while the case query is in flight so the row does not jump. */
function waitingKpi(label: string, tip: string, pending: boolean): AquaKpi {
  return {
    label,
    value: "—",
    delta: pending ? "Đang tải" : "Chưa tải được",
    good: true,
    tip,
  };
}

/** Resale-price median of the tracked project, as a percent change like the other count tiles. */
function priceKpi(median: MetricsValue<number | null>): AquaKpi {
  const growth =
    median.current === null || median.previous === null
      ? null
      : growthPercent(median.current, median.previous);
  return {
    label: "Giá rao bán lại",
    value: median.current === null ? "—" : `${decimal(median.current)} tr/m²`,
    delta:
      median.current === null
        ? "Chưa có giá rao"
        : growth === null
          ? "Chưa có kỳ trước"
          : `${decimal(formatSigned(growth))}%`,
    good: growth === null || growth >= 0,
    tip: PRICE_TIP,
  };
}

/**
 * Six tiles of the project-tracking demo: mentions, engagement (in place of reach),
 * resale price, NSS, buyer questions, negative share. Author count and share of
 * voice stay off this row.
 */
function projectOverviewKpis(
  data: OverviewMetricsResult,
  caseData: ProjectCaseMetricsResult | undefined,
  pending: boolean,
): AquaKpi[] {
  const price = caseData
    ? priceKpi(caseData.price.median)
    : waitingKpi("Giá rao bán lại", PRICE_TIP, pending);
  const questions = caseData
    ? countKpi("Câu hỏi của người mua", caseData.questions.total, QUESTION_TIP)
    : waitingKpi("Câu hỏi của người mua", QUESTION_TIP, pending);
  return [
    countKpi("Lượt đề cập", data.mentions, "Bài đăng, bình luận, trả lời có liên quan"),
    countKpi("Tương tác", data.engagement, "Tổng lượt thích, bình luận, chia sẻ", formatShort),
    price,
    pointKpi("Chỉ số cảm xúc (NSS)", data.nss, "(Tích cực − Tiêu cực) / Tổng đề cập đã phân loại × 100", {
      signed: true,
    }),
    questions,
    pointKpi("Tỷ lệ tiêu cực", data.negativeShare, "Phần trăm đề cập tiêu cực trên tổng đề cập đã phân loại", {
      suffix: "%",
      higherIsBetter: false,
    }),
  ];
}

/** Overview page of real projects, laid out as the approved demo (phase 5b). */
export function ProjectOverviewReport({
  scope,
  projectName,
  projectCase,
  banner,
  mentionsHref,
  caseHref,
  reportHref,
}: {
  scope: MetricsApiScope;
  projectName: string;
  projectCase: ProjectCase;
  banner: ProjectPageBannerProps;
  mentionsHref: string;
  caseHref: string;
  reportHref: string;
}) {
  const { t } = useT("dashboard");
  const [days, setDays] = useReportPeriodDays();
  const { data, error, isPending, isFetching } = useOverviewMetrics(scope, days);
  const caseMetrics = useProjectCaseMetrics(scope, days, projectCase === "project");
  const brandMetrics = useBrandCaseMetrics(scope, days, projectCase === "brand");
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
        loading={
          (isFetching && !isPending) ||
          (caseMetrics.isFetching && !caseMetrics.isPending) ||
          (brandMetrics.isFetching && !brandMetrics.isPending)
        }
      />
      <ProjectPageBanner {...banner} />
      {error ? <p className="text-sm text-destructive">{error.message}</p> : null}
      {caseMetrics.error ? <p className="text-sm text-destructive">{caseMetrics.error.message}</p> : null}
      {brandMetrics.error ? <p className="text-sm text-destructive">{brandMetrics.error.message}</p> : null}
      {data ? (
        <ReportKpis
          kpis={
            projectCase === "project"
              ? projectOverviewKpis(data, caseMetrics.data, caseMetrics.isPending)
              : buildKpis(data)
          }
          compareLabel={`vs ${days} ngày trước`}
        />
      ) : null}

      <ReportGrid>
        <ReportPanel
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
        </ReportPanel>
        <OverviewAiSummary scope={scope} reportHref={reportHref} />
        <ReportPanel title="Phân bổ cảm xúc" span="s4" scope="common">
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
        </ReportPanel>
        <ReportPanel
          title="Kênh thảo luận"
          span="s4"
          scope="common"
          note="Theo nguồn (group, page) có nhiều đề cập nhất trong kỳ"
        >
          {data?.sources.length ? (
            <ReportBars
              rows={data.sources.map((source) => ({
                label: source.name,
                value: source.mentions,
                display: formatCount(source.mentions),
              }))}
            />
          ) : (
            <MetricsEmpty>{isPending ? "Đang tải…" : "Chưa có đề cập trong kỳ."}</MetricsEmpty>
          )}
        </ReportPanel>
        <ReportPanel
          title="Chủ đề nổi bật"
          span="s4"
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
        </ReportPanel>
        {projectCase === "project" ? (
          <ProjectPricePanels
            data={caseMetrics.data}
            isPending={caseMetrics.isPending}
            days={days}
            caseLabel={t("cases.project")}
            detail={{ href: caseHref, label: t("caseNav.project") }}
          />
        ) : null}
        {projectCase === "brand" ? (
          <BrandCasePanels
            data={brandMetrics.data}
            isPending={brandMetrics.isPending}
            days={days}
            caseLabel={t("cases.brand")}
            detail={{ href: caseHref, label: t("caseNav.brand") }}
          />
        ) : null}
      </ReportGrid>
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
