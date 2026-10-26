"use client";

import { useT } from "next-i18next/client";
import { useState } from "react";

import { DemoGrid } from "@/components/projects/demo/demo-ui";
import {
  ProjectPageBanner,
  projectReportPageClassName,
  type ProjectPageBannerProps,
} from "@/components/projects/project-page-banner";
import { METRICS_CONFIG } from "@/lib/metrics/config";

import { BrandCasePanels } from "./brand-case-panels";
import { MetricsPageHeader } from "./metrics-page-header";
import { useBrandCaseMetrics, type MetricsApiScope } from "./use-metrics-api";

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
  const [days, setDays] = useState<number>(METRICS_CONFIG.reportPeriodDays[0]);
  const { data, error, isPending, isFetching } = useBrandCaseMetrics(scope, days);
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

      <DemoGrid>
        <BrandCasePanels
          data={data}
          isPending={isPending}
          days={days}
          caseLabel={caseLabel}
          withTrend
        />
      </DemoGrid>
    </div>
  );
}
