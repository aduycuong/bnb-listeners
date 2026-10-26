"use client";

import {
  DonutChart,
  GaugeChart,
  HealthLineChart,
  ProjectSentimentChart,
} from "@/components/projects/demo/demo-charts";
import { DemoPanel } from "@/components/projects/demo/demo-ui";
import { METRICS_CONFIG } from "@/lib/metrics/config";
import { reputationBand } from "@/lib/metrics/formulas";
import type { BrandCaseMetricsResult } from "@/lib/metrics/types";
import { AQUA_BRAND_COLORS, formatCount, formatSigned } from "@/lib/projects/aqua-demo";

import { detailNote, formatDayLabel, MetricsEmpty } from "./metrics-page-header";

const PERIOD_NAMES: Record<BrandCaseMetricsResult["trendPeriod"], string> = {
  week: "tuần",
  month: "tháng",
  quarter: "quý",
};

const SOV_COLORS = [...AQUA_BRAND_COLORS, "#8B5CF6", "#F97316", "#14B8A6", "#64748B"];

function periodLabel(start: string, period: BrandCaseMetricsResult["trendPeriod"]) {
  const [year, month] = start.split("-").map(Number);
  const shortYear = String(year).slice(2);
  if (period === "week") return formatDayLabel(start);
  if (period === "month") return `T${month}/${shortYear}`;
  return `Q${Math.ceil(month / 3)}/${shortYear}`;
}

/**
 * Reputation index, NSS per project and share of voice of a brand project. The overview
 * shows them as a preview with a link to the case page; the case page adds the trend.
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
  const sovTotal = data?.shareOfVoice.reduce((sum, row) => sum + row.mentions, 0) ?? 0;
  const periodName = data ? PERIOD_NAMES[data.trendPeriod] : "kỳ";
  const hasTrend = data?.trend.some((point) => point.primary !== null) ?? false;

  return (
    <>
      <DemoPanel
        title="Chỉ số uy tín chủ đầu tư"
        span="s4"
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
      </DemoPanel>
      <DemoPanel
        title="Cảm xúc theo từng dự án"
        span="s4"
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
                : "Thêm dự án của chủ đầu tư trong cấu hình project để so sánh.")}
          </MetricsEmpty>
        )}
      </DemoPanel>
      <DemoPanel
        title="Share of Voice cùng khu vực"
        span="s4"
        scope="case"
        scopeLabel={caseLabel}
        note={detailNote(
          data?.hasCompetitors
            ? "Đề cập nhắc chủ đầu tư hoặc dự án của chủ đầu tư, so với từng đối thủ"
            : undefined,
          detail,
        )}
      >
        {data?.hasCompetitors && sovTotal > 0 ? (
          <DonutChart
            data={data.shareOfVoice.map((row) => ({ name: row.name, value: row.mentions }))}
            colors={data.shareOfVoice.map((_, index) => SOV_COLORS[index % SOV_COLORS.length])}
          />
        ) : (
          <MetricsEmpty>
            {loading ??
              (data?.hasCompetitors
                ? "Chưa có đề cập nhắc tới chủ đầu tư hoặc đối thủ trong kỳ."
                : "Thêm chủ đầu tư để so sánh trong cấu hình project.")}
          </MetricsEmpty>
        )}
      </DemoPanel>
      {withTrend ? (
        <DemoPanel
          title={`Chỉ số uy tín ${METRICS_CONFIG.reputationTrendPeriods} ${periodName}`}
          span="s12"
          scope="case"
          scopeLabel={caseLabel}
          note={`Theo kỳ báo cáo trong cấu hình project, kỳ cuối đang chạy. Không phụ thuộc khoảng ngày đang chọn.`}
        >
          {data && hasTrend ? (
            <HealthLineChart
              labels={data.trend.map((point) => periodLabel(point.start, data.trendPeriod))}
              developer={data.trend.map((point) => point.primary)}
              peers={data.hasCompetitors ? data.trend.map((point) => point.competitors) : null}
              developerLabel={data.primaryName}
              peersLabel="TB chủ đầu tư so sánh"
            />
          ) : (
            <MetricsEmpty>
              {loading ?? `Chưa ${periodName} nào có đủ dữ liệu để tính chỉ số.`}
            </MetricsEmpty>
          )}
        </DemoPanel>
      ) : null}
    </>
  );
}
