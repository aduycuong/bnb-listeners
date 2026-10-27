"use client";

import { useT } from "next-i18next/client";

import {
  DonutChart,
  PriceTrendChart,
  RadarAttributeChart,
} from "@/components/metrics/report-ui/report-charts";
import { ReportGrid, ReportPanel, ReportTable } from "@/components/metrics/report-ui/report-ui";
import {
  ProjectPageBanner,
  projectReportPageClassName,
  type ProjectPageBannerProps,
} from "@/components/projects/project-page-banner";
import { meanOf, sharePercent } from "@/lib/metrics/formulas";
import {
  AQUA_BRAND_COLORS,
  formatCount,
  formatShort,
  formatSigned,
} from "@/lib/projects/aqua-demo";
import type { CompareCase } from "@/lib/projects/project-cases";

import { formatDayLabel, MetricsEmpty, MetricsPageHeader } from "./metrics-page-header";
import { decimal } from "./overview-kpis";
import { useCompareReports, type MetricsApiScope } from "./use-metrics-api";
import { useReportPeriodDays } from "./use-report-period-days";

const MEMBER_COLORS = [...AQUA_BRAND_COLORS];

const REPORTS = [
  { key: "kpis" },
  { key: "sentiment-trend" },
  { key: "aspect-sentiment" },
  { key: "price-trend" },
  { key: "reputation-index" },
  { key: "reputation-trend" },
] as const;

type Cell = number | null;

function show(value: Cell, format: (value: number) => string) {
  return value === null ? "—" : format(value);
}

/**
 * Overview of a compare project (D30): the members side by side with the plain mean of the
 * members (each project counts once). Aspects only line up keys every member has; days line
 * up by date in each member's timezone.
 */
export function CompareOverviewReport({
  scope,
  projectName,
  projectCase,
  banner,
}: {
  scope: MetricsApiScope;
  projectName: string;
  projectCase: CompareCase;
  banner: ProjectPageBannerProps;
}) {
  const { t } = useT("dashboard");
  const [days, setDays] = useReportPeriodDays();
  const { data, error, isPending, isFetching } = useCompareReports(scope, days, REPORTS);
  const members = (data?.members ?? []).map((member, index) => {
    const [kpis, trend, aspects, price, reputation, reputationTrend] = member.reports;
    return {
      id: member.id,
      name: member.name,
      color: MEMBER_COLORS[index % MEMBER_COLORS.length],
      kpis: kpis.data,
      trend: trend.data ?? [],
      aspects: aspects.data ?? [],
      price: price.data,
      reputation: reputation.data,
      reputationTrend: reputationTrend.data,
    };
  });
  const loading = isPending ? "Đang tải…" : null;
  const caseLabel = t(`cases.${projectCase}`);
  const totalMentions = members.reduce(
    (sum, member) => sum + (member.kpis?.mentions.current ?? 0),
    0,
  );

  type Member = (typeof members)[number];
  const columns: { label: string; read: (member: Member) => Cell; format: (value: number) => string }[] = [
    { label: "Đề cập", read: (member) => member.kpis?.mentions.current ?? null, format: formatCount },
    {
      label: "Share of Voice",
      read: (member) => sharePercent(member.kpis?.mentions.current ?? 0, totalMentions),
      format: (value) => `${decimal(value)}%`,
    },
    { label: "Tương tác", read: (member) => member.kpis?.engagement.current ?? null, format: formatShort },
    { label: "Tác giả", read: (member) => member.kpis?.uniqueAuthors.current ?? null, format: formatCount },
    {
      label: "NSS",
      read: (member) => member.kpis?.nss.current ?? null,
      format: (value) => formatSigned(value),
    },
    {
      label: "Tỷ lệ tiêu cực",
      read: (member) => member.kpis?.negativeShare.current ?? null,
      format: (value) => `${decimal(value)}%`,
    },
    ...(projectCase === "project_compare"
      ? [
          {
            label: "Giá rao (tr/m²)",
            read: (member: Member) => member.price?.median.current ?? null,
            format: (value: number) => decimal(value),
          },
        ]
      : [
          {
            label: "Chỉ số uy tín",
            read: (member: Member) => member.reputation?.index.current ?? null,
            format: (value: number) => String(value),
          },
        ]),
  ];

  // Days of every member's period, by date; a member without a day leaves a gap.
  const dates = [...new Set(members.flatMap((member) => member.trend.map((day) => day.date)))].sort();
  const series = (read: (member: Member, date: string) => Cell) =>
    members.map((member) => ({
      key: member.name,
      color: member.color,
      values: dates.map((date) => read(member, date)),
    }));
  const nssSeries = series(
    (member, date) => member.trend.find((day) => day.date === date)?.nss ?? null,
  );
  const priceSeries = series(
    (member, date) => member.price?.daily.find((day) => day.date === date)?.median ?? null,
  );
  const shared = data?.sharedAspects ?? [];
  const aspectSeries = members.map((member) => ({
    key: member.name,
    color: member.color,
    values: shared.map((aspect) => member.aspects.find((item) => item.key === aspect.key)?.nss ?? 0),
  }));
  const trendStarts = members[0]?.reputationTrend?.points.map((point) => point.start) ?? [];
  const reputationSeries = members.map((member) => ({
    key: member.name,
    color: member.color,
    values: trendStarts.map(
      (start) => member.reputationTrend?.points.find((point) => point.start === start)?.index ?? null,
    ),
  }));
  const hasValues = (list: { values: Cell[] }[]) =>
    list.some((item) => item.values.some((value) => value !== null));

  return (
    <div className={projectReportPageClassName}>
      <MetricsPageHeader
        title={t(`caseNav.${projectCase}`)}
        subtitle={`${projectName} · so sánh ${members.length} project, trung bình không trọng số`}
        days={days}
        onDaysChange={setDays}
        loading={isFetching && !isPending}
      />
      <ProjectPageBanner {...banner} />
      {error ? <p className="text-sm text-destructive">{error.message}</p> : null}
      {data?.issues.length ? (
        <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {data.issues.join(" ")} Sửa danh sách project trong cài đặt.
        </p>
      ) : null}
      {data?.warnings.length ? (
        <p className="rounded-xl bg-muted px-3 py-2 text-[13px] text-muted-foreground">
          {data.warnings.join(" ")}
        </p>
      ) : null}

      <ReportGrid>
        <ReportPanel
          title="Chỉ số chính"
          span="s12"
          scope="case"
          scopeLabel={caseLabel}
          note={`${days} ngày gần nhất của từng project. Trung bình: mỗi project tính một lần.`}
        >
          {members.length ? (
            <ReportTable
              headers={[
                { label: "Project" },
                ...columns.map((column) => ({ label: column.label, numeric: true })),
              ]}
              rows={[
                ...members.map((member) => [
                  <span key="name" className="inline-flex items-center gap-2 font-medium">
                    <i className="size-2.5 rounded-full" style={{ background: member.color }} />
                    {member.name}
                  </span>,
                  ...columns.map((column) => show(column.read(member), column.format)),
                ]),
                [
                  <b key="mean">Trung bình</b>,
                  ...columns.map((column) =>
                    show(meanOf(members.map((member) => column.read(member))), column.format),
                  ),
                ],
              ]}
            />
          ) : (
            <MetricsEmpty>{loading ?? "Chưa có project để so sánh."}</MetricsEmpty>
          )}
        </ReportPanel>
        <ReportPanel
          title="Share of Voice"
          span="s4"
          scope="case"
          scopeLabel={caseLabel}
          note="Đề cập của mỗi project trên tổng đề cập của các project"
        >
          {totalMentions > 0 ? (
            <DonutChart
              data={members.map((member) => ({
                name: member.name,
                value: member.kpis?.mentions.current ?? 0,
              }))}
              colors={members.map((member) => member.color)}
            />
          ) : (
            <MetricsEmpty>{loading ?? `Chưa có đề cập trong ${days} ngày gần nhất.`}</MetricsEmpty>
          )}
        </ReportPanel>
        <ReportPanel
          title="Chỉ số cảm xúc (NSS) theo ngày"
          span="s8"
          scope="case"
          scopeLabel={caseLabel}
          note="Ngày không có đề cập đã phân loại cảm xúc để trống"
        >
          {hasValues(nssSeries) ? (
            <PriceTrendChart days={dates.map(formatDayLabel)} series={nssSeries} />
          ) : (
            <MetricsEmpty>{loading ?? "Chưa có đề cập đã phân loại cảm xúc trong kỳ."}</MetricsEmpty>
          )}
        </ReportPanel>
        <ReportPanel
          title="Cảm xúc theo khía cạnh"
          span="s6"
          scope="case"
          scopeLabel={caseLabel}
          note={`NSS theo ${shared.length} khía cạnh có ở mọi project`}
        >
          {shared.length && members.length ? (
            <RadarAttributeChart labels={shared.map((aspect) => aspect.name)} series={aspectSeries} />
          ) : (
            <MetricsEmpty>{loading ?? "Các project không có khía cạnh chung để so sánh."}</MetricsEmpty>
          )}
        </ReportPanel>
        {projectCase === "project_compare" ? (
          <ReportPanel
            title="Giá rao bán lại theo ngày"
            span="s6"
            scope="case"
            scopeLabel={caseLabel}
            note="Trung vị giá rao của từng dự án, triệu đồng/m²"
          >
            {hasValues(priceSeries) ? (
              <PriceTrendChart days={dates.map(formatDayLabel)} series={priceSeries} />
            ) : (
              <MetricsEmpty>{loading ?? `Chưa có giá rao bán trong ${days} ngày gần nhất.`}</MetricsEmpty>
            )}
          </ReportPanel>
        ) : (
          <ReportPanel
            title="Chỉ số uy tín theo kỳ"
            span="s6"
            scope="case"
            scopeLabel={caseLabel}
            note="Theo kỳ báo cáo trong cấu hình của từng chủ đầu tư, kỳ cuối đang chạy"
          >
            {hasValues(reputationSeries) ? (
              <PriceTrendChart days={trendStarts.map(formatDayLabel)} series={reputationSeries} />
            ) : (
              <MetricsEmpty>{loading ?? "Chưa kỳ nào có đủ dữ liệu để tính chỉ số."}</MetricsEmpty>
            )}
          </ReportPanel>
        )}
      </ReportGrid>
    </div>
  );
}
