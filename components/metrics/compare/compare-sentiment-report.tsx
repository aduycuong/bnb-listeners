"use client";

import {
  GroupedBarChart,
  PriceTrendChart,
  StackedShareChart,
} from "@/components/metrics/report-ui/report-charts";
import { ReportGrid, ReportPanel } from "@/components/metrics/report-ui/report-ui";
import type { ProjectPageBannerProps } from "@/components/projects/project-page-banner";
import { EMOTION_LABELS, EMOTIONS } from "@/lib/enrichment/config";
import { formatSigned } from "@/lib/projects/aqua-demo";

import { formatDayLabel, MetricsEmpty } from "../metrics-page-header";
import { decimal } from "../overview-kpis";
import { useCompareReports, type MetricsApiScope } from "../use-metrics-api";
import { useReportPeriodDays } from "../use-report-period-days";
import { compareLineSeries, toComparedMembers } from "./compare-members";
import { CompareReportShell } from "./compare-report-shell";
import { CompareTable, type CompareRow } from "./compare-table";

const REPORTS = [
  { key: "sentiment-breakdown" },
  { key: "sentiment-trend" },
  { key: "emotions" },
  { key: "aspect-sentiment" },
] as const;

/** Sentiment of the primary project against its competitors (D30). */
export function CompareSentimentReport({
  scope,
  projectName,
  caseLabel,
  banner,
}: {
  scope: MetricsApiScope;
  projectName: string;
  caseLabel: string;
  banner: ProjectPageBannerProps;
}) {
  const [days, setDays] = useReportPeriodDays();
  const { data, error, isPending, isFetching } = useCompareReports(scope, days, REPORTS);
  const members = toComparedMembers(data?.members ?? []).map((member) => {
    const [breakdown, trend, emotions, aspects] = member.reports;
    return {
      ...member,
      breakdown: breakdown.data,
      trend: trend.data ?? [],
      emotions: emotions.data ?? [],
      aspects: aspects.data ?? [],
    };
  });
  type Member = (typeof members)[number];
  const loading = isPending ? "Đang tải…" : null;
  const shared = data?.sharedAspects ?? [];
  const dates = [...new Set(members.flatMap((member) => member.trend.map((day) => day.date)))].sort();
  const nssSeries = compareLineSeries(
    members,
    dates,
    (member, date) => member.trend.find((day) => day.date === date)?.nss ?? null,
  );
  const hasBreakdown = members.some((member) => {
    const counts = member.breakdown;
    return counts ? counts.positive + counts.neutral + counts.negative > 0 : false;
  });
  const hasEmotions = members.some((member) => member.emotions.some((item) => item.mentions > 0));
  const percent = (value: number) => `${decimal(value)}%`;

  return (
    <CompareReportShell
      title="Cảm xúc"
      subtitle={`${projectName} · cảm xúc của project chính so với đối thủ`}
      days={days}
      onDaysChange={setDays}
      loading={isFetching && !isPending}
      banner={banner}
      error={error}
      issues={data?.issues}
      warnings={data?.warnings}
    >
      <ReportGrid>
        <ReportPanel
          title="Phân bổ cảm xúc"
          span="s5"
          scope="case"
          scopeLabel={caseLabel}
          note="Tỷ lệ trên các đề cập đã phân loại cảm xúc của từng project"
        >
          {hasBreakdown ? (
            <StackedShareChart
              rows={members.map((member) => ({
                name: member.name,
                values: [
                  member.breakdown?.positive ?? 0,
                  member.breakdown?.neutral ?? 0,
                  member.breakdown?.negative ?? 0,
                ],
              }))}
              segments={[
                { key: "Tích cực", color: "var(--pos)" },
                { key: "Trung lập", color: "var(--neu)" },
                { key: "Tiêu cực", color: "var(--neg)" },
              ]}
            />
          ) : (
            <MetricsEmpty>{loading ?? "Chưa có đề cập đã phân loại cảm xúc trong kỳ."}</MetricsEmpty>
          )}
        </ReportPanel>
        <ReportPanel
          title="Chỉ số cảm xúc (NSS) theo ngày"
          span="s7"
          scope="case"
          scopeLabel={caseLabel}
          note="Nét đậm: project chính. Nét đứt: TB đối thủ. Ngày không có đề cập đã phân loại để trống."
        >
          {nssSeries.some((series) => series.values.some((value) => value !== null)) ? (
            <PriceTrendChart days={dates.map(formatDayLabel)} series={nssSeries} />
          ) : (
            <MetricsEmpty>{loading ?? "Chưa có đề cập đã phân loại cảm xúc trong kỳ."}</MetricsEmpty>
          )}
        </ReportPanel>
        <ReportPanel
          title="Cảm xúc chi tiết"
          span="s12"
          scope="case"
          scopeLabel={caseLabel}
          note="Tỷ lệ mỗi cảm xúc trong các đề cập có cảm xúc của từng project"
        >
          {hasEmotions ? (
            <GroupedBarChart
              categories={EMOTIONS.map((emotion) => EMOTION_LABELS[emotion])}
              series={members.map((member) => ({
                key: member.name,
                color: member.color,
                values: EMOTIONS.map(
                  (emotion) => member.emotions.find((item) => item.emotion === emotion)?.share ?? 0,
                ),
              }))}
              unit="%"
            />
          ) : (
            <MetricsEmpty>{loading ?? "Chưa có đề cập có cảm xúc trong kỳ."}</MetricsEmpty>
          )}
        </ReportPanel>
        <ReportPanel
          title="Cảm xúc theo khía cạnh"
          span="s12"
          scope="case"
          scopeLabel={caseLabel}
          note={`NSS của ${shared.length} khía cạnh có ở mọi project; dòng dưới là tỷ lệ tiêu cực.`}
        >
          {shared.length && members.length ? (
            <CompareTable
              members={members}
              rowHeader="Khía cạnh"
              rows={shared.flatMap((aspect): CompareRow<Member>[] => {
                const find = (member: Member) =>
                  member.aspects.find((item) => item.key === aspect.key);
                return [
                  {
                    label: <b>{aspect.name}</b>,
                    read: (member) => find(member)?.nss ?? null,
                    format: (value: number) => formatSigned(value),
                    higherIsBetter: true,
                    gapUnit: " điểm",
                  },
                  {
                    label: <span className="pl-3 text-muted-foreground">tiêu cực</span>,
                    read: (member) => {
                      const item = find(member);
                      return item && item.mentions > 0 ? item.negative : null;
                    },
                    format: percent,
                    higherIsBetter: false,
                    gapUnit: " điểm",
                  },
                ];
              })}
            />
          ) : (
            <MetricsEmpty>{loading ?? "Các project không có khía cạnh chung để so sánh."}</MetricsEmpty>
          )}
        </ReportPanel>
      </ReportGrid>
    </CompareReportShell>
  );
}
