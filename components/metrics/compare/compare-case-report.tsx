"use client";

import { PriceTrendChart, ProjectSentimentChart } from "@/components/metrics/report-ui/report-charts";
import { ReportBars, ReportGrid, ReportPanel } from "@/components/metrics/report-ui/report-ui";
import type { ProjectPageBannerProps } from "@/components/projects/project-page-banner";
import { formatCount } from "@/lib/projects/aqua-demo";
import type { CompareCase } from "@/lib/projects/project-cases";

import { formatDayLabel, MetricsEmpty } from "../metrics-page-header";
import { decimal } from "../overview-kpis";
import { useCompareReports, type MetricsApiScope } from "../use-metrics-api";
import { useReportPeriodDays } from "../use-report-period-days";
import { compareLineSeries, toComparedMembers } from "./compare-members";
import { CompareReportShell, MemberColumns } from "./compare-report-shell";
import { CompareTable } from "./compare-table";

const REPORTS = [
  { key: "price-trend" },
  { key: "buyer-questions", params: { limit: 5 } },
  { key: "reputation-index" },
  { key: "reputation-trend" },
  { key: "product-sentiment" },
] as const;

/**
 * Case numbers of a compare project (D30): resale prices and buyer questions when comparing
 * projects, the reputation index and the developers' projects when comparing developers.
 */
export function CompareCaseReport({
  scope,
  projectName,
  projectCase,
  title,
  caseLabel,
  banner,
}: {
  scope: MetricsApiScope;
  projectName: string;
  projectCase: CompareCase;
  title: string;
  caseLabel: string;
  banner: ProjectPageBannerProps;
}) {
  const [days, setDays] = useReportPeriodDays();
  const { data, error, isPending, isFetching } = useCompareReports(scope, days, REPORTS);
  const members = toComparedMembers(data?.members ?? []).map((member) => {
    const [price, questions, reputation, reputationTrend, products] = member.reports;
    return {
      ...member,
      price: price.data,
      questions: questions.data,
      reputation: reputation.data,
      reputationTrend: reputationTrend.data,
      products: products.data ?? [],
    };
  });
  const loading = isPending ? "Đang tải…" : null;
  const primary = members.find((member) => member.primary);

  const dates = [
    ...new Set(members.flatMap((member) => member.price?.daily.map((day) => day.date) ?? [])),
  ].sort();
  const priceSeries = compareLineSeries(
    members,
    dates,
    (member, date) => member.price?.daily.find((day) => day.date === date)?.median ?? null,
  );
  const starts = primary?.reputationTrend?.points.map((point) => point.start) ?? [];
  const reputationSeries = compareLineSeries(
    members,
    starts,
    (member, start) =>
      member.reputationTrend?.points.find((point) => point.start === start)?.index ?? null,
  );
  const hasValues = (list: { values: (number | null)[] }[]) =>
    list.some((item) => item.values.some((value) => value !== null));
  const pillars = primary?.reputation?.pillars ?? [];

  return (
    <CompareReportShell
      title={title}
      subtitle={`${projectName} · ${title.toLowerCase()} của project chính so với đối thủ`}
      days={days}
      onDaysChange={setDays}
      loading={isFetching && !isPending}
      banner={banner}
      error={error}
      issues={data?.issues}
      warnings={data?.warnings}
    >
      {projectCase === "project_compare" ? (
        <ReportGrid>
          <ReportPanel
            title="Giá rao bán lại theo ngày"
            span="s12"
            scope="case"
            scopeLabel={caseLabel}
            note="Trung vị giá rao của từng dự án, triệu đồng/m². Nét đứt: TB đối thủ."
          >
            {hasValues(priceSeries) ? (
              <PriceTrendChart days={dates.map(formatDayLabel)} series={priceSeries} />
            ) : (
              <MetricsEmpty>{loading ?? `Chưa có giá rao bán trong ${days} ngày gần nhất.`}</MetricsEmpty>
            )}
          </ReportPanel>
          <ReportPanel title="Giá và câu hỏi" span="s5" scope="case" scopeLabel={caseLabel}>
            {members.length ? (
              <CompareTable
                members={members}
                rows={[
                  {
                    label: "Giá trung vị (tr/m²)",
                    read: (member) => member.price?.median.current ?? null,
                    format: (value) => decimal(value),
                  },
                  {
                    label: "Kỳ trước",
                    read: (member) => member.price?.median.previous ?? null,
                    format: (value) => decimal(value),
                  },
                  {
                    label: "Tin rao dùng để tính",
                    read: (member) => member.price?.used ?? null,
                    format: formatCount,
                  },
                  {
                    label: "Câu hỏi người mua",
                    read: (member) => member.questions?.total.current ?? null,
                    format: formatCount,
                  },
                ]}
              />
            ) : (
              <MetricsEmpty>{loading ?? "Chưa có project để so sánh."}</MetricsEmpty>
            )}
          </ReportPanel>
          <ReportPanel
            title="Câu hỏi thường gặp của người mua"
            span="s7"
            scope="case"
            scopeLabel={caseLabel}
            note="Top 5 nhóm câu hỏi của từng dự án"
          >
            {members.length ? (
              <MemberColumns
                members={members}
                render={(member) =>
                  member.questions?.items.length ? (
                    <ReportBars
                      rows={member.questions.items.map((question) => ({
                        label: question.name,
                        value: question.mentions,
                        display: formatCount(question.mentions),
                      }))}
                    />
                  ) : (
                    <p className="text-[13px] text-muted-foreground">
                      {member.questions ? "Chưa có câu hỏi." : "Chưa bật gom câu hỏi người mua."}
                    </p>
                  )
                }
              />
            ) : (
              <MetricsEmpty>{loading ?? "Chưa có project để so sánh."}</MetricsEmpty>
            )}
          </ReportPanel>
        </ReportGrid>
      ) : (
        <ReportGrid>
          <ReportPanel
            title="Chỉ số uy tín và các trụ cột"
            span="s12"
            scope="case"
            scopeLabel={caseLabel}
            note="Thang 0–100; trụ cột ghép theo khía cạnh của project chính"
          >
            {members.length ? (
              <CompareTable
                members={members}
                rows={[
                  {
                    label: <b>Chỉ số uy tín</b>,
                    read: (member) => member.reputation?.index.current ?? null,
                    format: (value) => String(value),
                    higherIsBetter: true,
                    gapUnit: " điểm",
                  },
                  ...pillars.map((pillar) => ({
                    label: <span className="pl-3">{pillar.name}</span>,
                    read: (member: (typeof members)[number]) =>
                      member.reputation?.pillars.find((item) => item.key === pillar.key)?.score ?? null,
                    format: (value: number) => String(value),
                    higherIsBetter: true,
                    gapUnit: " điểm",
                  })),
                ]}
              />
            ) : (
              <MetricsEmpty>{loading ?? "Chưa có project để so sánh."}</MetricsEmpty>
            )}
          </ReportPanel>
          <ReportPanel
            title="Chỉ số uy tín theo kỳ"
            span="s12"
            scope="case"
            scopeLabel={caseLabel}
            note="Theo kỳ báo cáo của project chính, kỳ cuối đang chạy. Nét đứt: TB đối thủ."
          >
            {hasValues(reputationSeries) ? (
              <PriceTrendChart days={starts.map(formatDayLabel)} series={reputationSeries} />
            ) : (
              <MetricsEmpty>{loading ?? "Chưa kỳ nào có đủ dữ liệu để tính chỉ số."}</MetricsEmpty>
            )}
          </ReportPanel>
          <ReportPanel
            title="Cảm xúc theo từng dự án"
            span="s12"
            scope="case"
            scopeLabel={caseLabel}
            note="NSS các dự án của từng chủ đầu tư"
          >
            {members.length ? (
              <MemberColumns
                members={members}
                render={(member) => {
                  const rows = member.products.filter((product) => product.nss !== null);
                  return rows.length ? (
                    <ProjectSentimentChart
                      rows={rows.map((product) => ({ name: product.name, value: product.nss ?? 0 }))}
                    />
                  ) : (
                    <p className="text-[13px] text-muted-foreground">Chưa có đề cập về các dự án.</p>
                  );
                }}
              />
            ) : (
              <MetricsEmpty>{loading ?? "Chưa có project để so sánh."}</MetricsEmpty>
            )}
          </ReportPanel>
        </ReportGrid>
      )}
    </CompareReportShell>
  );
}
