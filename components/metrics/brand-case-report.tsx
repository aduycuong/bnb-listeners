"use client";

import { useT } from "next-i18next/client";

import { ReportGrid } from "@/components/metrics/report-ui/report-ui";
import {
  ProjectPageBanner,
  projectReportPageClassName,
  type ProjectPageBannerProps,
} from "@/components/projects/project-page-banner";

import { ProductSentimentPanel, ReputationIndexPanel, ReputationTrendPanel } from "./brand-case-panels";
import { MetricsPageHeader } from "./metrics-page-header";
import { useReports, type MetricsApiScope } from "./use-metrics-api";
import { useReportPeriodDays } from "./use-report-period-days";

const REPORTS = [
  { key: "reputation-index" },
  { key: "product-sentiment" },
  { key: "reputation-trend" },
] as const;

/** Case page of a `brand` listening case (`Chỉ số uy tín`), laid out as the approved demo. */
export function BrandCaseReport({
  scope,
  projectName,
  banner,
}: {
  scope: MetricsApiScope;
  projectName: string;
  banner: ProjectPageBannerProps;
}) {
  const { t } = useT("dashboard");
  const [days, setDays] = useReportPeriodDays();
  const { data, error, isPending, isFetching } = useReports(scope, days, REPORTS);
  const [index, products, trend] = data?.reports ?? [];
  const caseLabel = t("cases.brand");

  return (
    <div className={projectReportPageClassName}>
      <MetricsPageHeader
        title={t("caseNav.brand")}
        subtitle={`${projectName} · trang chỉ có ở kiểu case “${caseLabel}”`}
        days={days}
        onDaysChange={setDays}
        loading={isFetching && !isPending}
      />
      <ProjectPageBanner {...banner} />
      {error ? <p className="text-sm text-destructive">{error.message}</p> : null}

      <ReportGrid>
        <ReputationIndexPanel report={index} isPending={isPending} caseLabel={caseLabel} days={days} />
        <ProductSentimentPanel report={products} isPending={isPending} caseLabel={caseLabel} />
        <ReputationTrendPanel
          report={trend}
          isPending={isPending}
          caseLabel={caseLabel}
          subjectName={data?.subject?.name ?? projectName}
        />
      </ReportGrid>
    </div>
  );
}
