"use client";

import { useT } from "next-i18next/client";
import { useState } from "react";

import { DonutChart, RadarAttributeChart } from "@/components/metrics/report-ui/report-charts";
import { ReportGrid, ReportKpis, ReportPanel } from "@/components/metrics/report-ui/report-ui";
import type { ProjectPageBannerProps } from "@/components/projects/project-page-banner";
import { meanOf, sharePercent } from "@/lib/metrics/formulas";
import {
  formatCount,
  formatShort,
  formatSigned,
  type AquaKpi,
} from "@/lib/projects/aqua-demo";
import type { CompareCase } from "@/lib/projects/project-cases";

import { MetricsEmpty } from "../metrics-page-header";
import { decimal } from "../overview-kpis";
import { useCompareReports, type MetricsApiScope } from "../use-metrics-api";
import { useReportPeriodDays } from "../use-report-period-days";
import { COMPETITOR_MEAN_COLOR, COMPETITOR_MEAN_LABEL, toComparedMembers } from "./compare-members";
import { CompareReportShell } from "./compare-report-shell";
import { compareGap, CompareTable, formatGap, type CompareRow } from "./compare-table";

const REPORTS = [
  { key: "kpis" },
  { key: "aspect-sentiment" },
  { key: "price-trend" },
  { key: "reputation-index" },
] as const;

/**
 * Overview of a compare project (D30): the primary project against its competitors' mean
 * (each competitor counts once), the key figures of every member, share of voice and the
 * aspects every member has.
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
  const [allCompetitors, setAllCompetitors] = useState(false);
  const { data, error, isPending, isFetching } = useCompareReports(scope, days, REPORTS);
  const members = toComparedMembers(data?.members ?? []).map((member) => {
    const [kpis, aspects, price, reputation] = member.reports;
    return {
      ...member,
      kpis: kpis.data,
      aspects: aspects.data ?? [],
      price: price.data,
      reputation: reputation.data,
    };
  });
  type Member = (typeof members)[number];
  const loading = isPending ? "Đang tải…" : null;
  const primary = members.find((member) => member.primary);
  const totalMentions = members.reduce(
    (sum, member) => sum + (member.kpis?.mentions.current ?? 0),
    0,
  );

  const rows: (CompareRow<Member> & { tile?: boolean })[] = [
    {
      label: "Đề cập",
      read: (m) => m.kpis?.mentions.current ?? null,
      format: formatCount,
      higherIsBetter: true,
      tile: true,
    },
    {
      label: "Share of Voice",
      read: (m) => sharePercent(m.kpis?.mentions.current ?? 0, totalMentions),
      format: (value) => `${decimal(value)}%`,
      higherIsBetter: true,
      gapUnit: " điểm",
      tile: true,
    },
    {
      label: "Tương tác",
      read: (m) => m.kpis?.engagement.current ?? null,
      format: formatShort,
      higherIsBetter: true,
      tile: true,
    },
    {
      label: "Tác giả",
      read: (m) => m.kpis?.uniqueAuthors.current ?? null,
      format: formatCount,
      higherIsBetter: true,
    },
    {
      label: "NSS",
      read: (m) => m.kpis?.nss.current ?? null,
      format: (value) => formatSigned(value),
      higherIsBetter: true,
      gapUnit: " điểm",
      tile: true,
    },
    {
      label: "Tỷ lệ tiêu cực",
      read: (m) => m.kpis?.negativeShare.current ?? null,
      format: (value) => `${decimal(value)}%`,
      higherIsBetter: false,
      gapUnit: " điểm",
      tile: true,
    },
    projectCase === "project_compare"
      ? {
          label: "Giá rao (tr/m²)",
          read: (m) => m.price?.median.current ?? null,
          format: (value) => decimal(value),
          tile: true,
        }
      : {
          label: "Chỉ số uy tín",
          read: (m) => m.reputation?.index.current ?? null,
          format: (value) => String(value),
          higherIsBetter: true,
          gapUnit: " điểm",
          tile: true,
        },
  ];

  const kpis: AquaKpi[] = primary
    ? rows
        .filter((row) => row.tile)
        .map((row) => {
          const value = row.read(primary);
          const gap = compareGap(members, row);
          return {
            label: row.label as string,
            value: value === null ? "—" : row.format(value),
            delta: gap === null ? "Chưa đủ số liệu" : formatGap(gap, row),
            good:
              gap === null || row.higherIsBetter === undefined || gap === 0
                ? true
                : (gap > 0) === row.higherIsBetter,
            tip: `${primary.name} so với trung bình không trọng số của các đối thủ`,
          };
        })
    : [];

  const shared = data?.sharedAspects ?? [];
  const competitors = members.filter((member) => !member.primary);
  const aspectNss = (member: Member, key: string) =>
    member.aspects.find((item) => item.key === key)?.nss ?? null;
  const radarSeries = [
    ...(primary ? [primary] : []),
    ...(allCompetitors ? competitors : []),
  ].map((member) => ({
    key: member.name,
    color: member.color,
    values: shared.map((aspect) => aspectNss(member, aspect.key) ?? 0),
  }));
  if (!allCompetitors && competitors.length) {
    radarSeries.push({
      key: COMPETITOR_MEAN_LABEL,
      color: COMPETITOR_MEAN_COLOR,
      values: shared.map(
        (aspect) => meanOf(competitors.map((member) => aspectNss(member, aspect.key))) ?? 0,
      ),
    });
  }

  return (
    <CompareReportShell
      title={t(`cases.${projectCase}`)}
      subtitle={`${projectName} · ${primary?.name ?? "project chính"} so với ${competitors.length} đối thủ`}
      days={days}
      onDaysChange={setDays}
      loading={isFetching && !isPending}
      banner={banner}
      error={error}
      issues={data?.issues}
      warnings={data?.warnings}
    >
      {kpis.length ? <ReportKpis kpis={kpis} compareLabel="vs TB đối thủ" /> : null}
      <ReportGrid>
        <ReportPanel
          title="Chỉ số chính"
          span="s12"
          scope="case"
          scopeLabel={t(`cases.${projectCase}`)}
          note={`${days} ngày gần nhất của từng project. TB đối thủ: mỗi đối thủ tính một lần; chênh lệch là project chính trừ TB đối thủ.`}
        >
          {members.length ? (
            <CompareTable members={members} rows={rows} />
          ) : (
            <MetricsEmpty>{loading ?? "Chưa có project để so sánh."}</MetricsEmpty>
          )}
        </ReportPanel>
        <ReportPanel
          title="Share of Voice"
          span="s5"
          scope="case"
          scopeLabel={t(`cases.${projectCase}`)}
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
          title="Cảm xúc theo khía cạnh"
          span="s7"
          scope="case"
          scopeLabel={t(`cases.${projectCase}`)}
          note={
            <span className="flex flex-wrap items-center justify-between gap-2">
              NSS theo {shared.length} khía cạnh có ở mọi project
              {competitors.length > 1 ? (
                <button
                  type="button"
                  className="font-medium text-foreground underline"
                  onClick={() => setAllCompetitors((value) => !value)}
                >
                  {allCompetitors ? "Chỉ hiện TB đối thủ" : "Hiện từng đối thủ"}
                </button>
              ) : null}
            </span>
          }
        >
          {shared.length && members.length ? (
            <RadarAttributeChart labels={shared.map((aspect) => aspect.name)} series={radarSeries} />
          ) : (
            <MetricsEmpty>{loading ?? "Các project không có khía cạnh chung để so sánh."}</MetricsEmpty>
          )}
        </ReportPanel>
      </ReportGrid>
    </CompareReportShell>
  );
}
