"use client";

import {
  GaugeChart,
  HealthLineChart,
  ProjectSentimentChart,
} from "@/components/metrics/report-ui/report-charts";
import { ReportPanel } from "@/components/metrics/report-ui/report-ui";
import { METRICS_CONFIG } from "@/lib/metrics/config";
import { reputationBand } from "@/lib/metrics/formulas";
import type { BrandCaseMetricsResult } from "@/lib/metrics/types";
import { formatCount, formatSigned } from "@/lib/projects/aqua-demo";

import { detailNote, formatDayLabel, MetricsEmpty } from "./metrics-page-header";

const PERIOD_NAMES: Record<BrandCaseMetricsResult["trendPeriod"], string> = {
  week: "tuần",
  month: "tháng",
  quarter: "quý",
};

function periodLabel(start: string, period: BrandCaseMetricsResult["trendPeriod"]) {
  const [year, month] = start.split("-").map(Number);
  const shortYear = String(year).slice(2);
  if (period === "week") return formatDayLabel(start);
  if (period === "month") return `T${month}/${shortYear}`;
  return `Q${Math.ceil(month / 3)}/${shortYear}`;
}

/**
 * Reputation index and NSS per project of a brand project. The overview shows them as a
 * preview with a link to the case page; the case page adds the trend.
 */
export function BrandCasePanels({
  data,
  isPending,
  days,
  caseLabel,
  detail,
  withTrend = false,
}: {
  data: BrandCaseMetricsResult | undefined;
  isPending: boolean;
  days: number;
  caseLabel: string;
  detail?: { href: string; label: string };
  withTrend?: boolean;
}) {
  const loading = isPending ? "Đang tải…" : null;
  const pillarCount = data?.pillars.length ?? 0;
  const indexDelta =
    data?.index.current != null && data.index.previous != null
      ? `${formatSigned(data.index.current - data.index.previous)} điểm so với ${days} ngày trước`
      : null;
  const products = data?.products.filter((product) => product.nss !== null) ?? [];
  const periodName = data ? PERIOD_NAMES[data.trendPeriod] : "kỳ";
  const hasTrend = data?.trend.some((point) => point.index !== null) ?? false;

  return (
    <>
      <ReportPanel
        title="Chỉ số uy tín chủ đầu tư"
        span="s6"
        scope="case"
        scopeLabel={caseLabel}
        note={detailNote(
          [`Tổng hợp từ ${pillarCount} trụ cột, thang 0–100`, indexDelta].filter(Boolean).join(" · "),
          detail,
        )}
      >
        {data && data.index.current !== null ? (
          <>
            <GaugeChart score={data.index.current} label={reputationBand(data.index.current)} />
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              {data.pillars.map((pillar) => (
                <div
                  key={pillar.id}
                  className="rounded-[10px] bg-muted px-3 py-2 text-xs text-muted-foreground"
                  title={`${formatCount(pillar.mentions)} đề cập có cảm xúc`}
                >
                  {pillar.name}
                  <b className="mt-0.5 block text-[17px] text-foreground">
                    {pillar.score ?? "—"}
                  </b>
                  {pillar.score === null ? <small>Chưa đủ dữ liệu</small> : null}
                </div>
              ))}
            </div>
          </>
        ) : (
          <MetricsEmpty>
            {loading ??
              `Chưa trụ cột nào có đủ ${METRICS_CONFIG.reputationMinMentions} đề cập có cảm xúc trong ${days} ngày gần nhất.`}
          </MetricsEmpty>
        )}
      </ReportPanel>
      <ReportPanel
        title="Cảm xúc theo từng dự án"
        span="s6"
        scope="case"
        scopeLabel={caseLabel}
        note={detailNote("NSS của các dự án của chủ đầu tư", detail)}
      >
        {products.length ? (
          <ProjectSentimentChart
            rows={products.map((product) => ({ name: product.name, value: product.nss ?? 0 }))}
          />
        ) : (
          <MetricsEmpty>
            {loading ??
              (data?.products.length
                ? "Chưa có đề cập về các dự án trong kỳ."
                : "Thêm dự án của chủ đầu tư trong cấu hình project để xem cảm xúc theo từng dự án.")}
          </MetricsEmpty>
        )}
      </ReportPanel>
      {withTrend ? (
        <ReportPanel
          title={`Chỉ số uy tín ${METRICS_CONFIG.reputationTrendPeriods} ${periodName}`}
          span="s12"
          scope="case"
          scopeLabel={caseLabel}
          note={`Theo kỳ báo cáo trong cấu hình project, kỳ cuối đang chạy. Không phụ thuộc khoảng ngày đang chọn.`}
        >
          {data && hasTrend ? (
            <HealthLineChart
              labels={data.trend.map((point) => periodLabel(point.start, data.trendPeriod))}
              developer={data.trend.map((point) => point.index)}
              developerLabel={data.subjectName}
            />
          ) : (
            <MetricsEmpty>
              {loading ?? `Chưa ${periodName} nào có đủ dữ liệu để tính chỉ số.`}
            </MetricsEmpty>
          )}
        </ReportPanel>
      ) : null}
    </>
  );
}
