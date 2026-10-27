"use client";

import Link from "next/link";
import { useT } from "next-i18next/client";

import { RadarAttributeChart } from "@/components/metrics/report-ui/report-charts";
import { ReportGrid, ReportPanel } from "@/components/metrics/report-ui/report-ui";
import {
  ProjectPageBanner,
  projectReportPageClassName,
  type ProjectPageBannerProps,
} from "@/components/projects/project-page-banner";
import { formatCount } from "@/lib/projects/aqua-demo";

import { MetricsEmpty, MetricsPageHeader } from "./metrics-page-header";
import { PriceDistributionPanel, PriceTrendPanel } from "./project-price-panels";
import { useReports, type MetricsApiScope } from "./use-metrics-api";
import { useReportPeriodDays } from "./use-report-period-days";

const REPORTS = [
  { key: "price-trend" },
  { key: "price-distribution" },
  { key: "buyer-questions" },
  { key: "aspect-sentiment" },
] as const;

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
  const [days, setDays] = useReportPeriodDays();
  const { data, error, isPending, isFetching } = useReports(scope, days, REPORTS);
  const [priceTrend, priceDistribution, buyerQuestions, aspectSentiment] = data?.reports ?? [];
  const questions = buyerQuestions?.data;
  const loading = isPending ? "Đang tải…" : null;
  const caseLabel = t("cases.project");
  const subjectName = data?.subject?.name ?? projectName;
  const radarAspects = aspectSentiment?.data?.filter((aspect) => aspect.nss != null) ?? [];
  const radarSeries = [
    { key: subjectName, color: "#0091FF", values: radarAspects.map((aspect) => aspect.nss ?? 0) },
  ];

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

      <ReportGrid>
        <PriceTrendPanel
          report={priceTrend}
          isPending={isPending}
          days={days}
          caseLabel={caseLabel}
          subjectName={subjectName}
        />
        <PriceDistributionPanel
          report={priceDistribution}
          isPending={isPending}
          days={days}
          caseLabel={caseLabel}
        />
        <ReportPanel
          title="Câu hỏi thường gặp của người mua"
          span="s6"
          scope="case"
          scopeLabel={caseLabel}
          note={
            questions
              ? questions.total.current
                ? `AI gom nhóm từ ${formatCount(questions.total.current)} câu hỏi`
                : "Chưa có câu hỏi người mua trong kỳ"
              : undefined
          }
        >
          {questions?.items.length ? (
            <div className="flex flex-col">
              {questions.items.map((question) => (
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
        </ReportPanel>
        <ReportPanel
          title="Cảm xúc theo khía cạnh"
          span="s6"
          scope="case"
          scopeLabel={caseLabel}
          note="Điểm cảm xúc ròng (NSS) của dự án theo từng khía cạnh"
        >
          {radarAspects.length ? (
            <RadarAttributeChart
              labels={radarAspects.map((aspect) => aspect.name)}
              series={radarSeries}
            />
          ) : (
            <MetricsEmpty>
              {loading ?? "Chưa có khía cạnh đã phân loại cảm xúc trong kỳ."}
            </MetricsEmpty>
          )}
        </ReportPanel>
      </ReportGrid>
    </div>
  );
}
