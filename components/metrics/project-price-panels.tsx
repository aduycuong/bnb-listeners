"use client";

import { PriceBucketChart, PriceTrendChart } from "@/components/metrics/report-ui/report-charts";
import { ReportPanel } from "@/components/metrics/report-ui/report-ui";
import { formatCount } from "@/lib/projects/aqua-demo";
import type { ProjectCaseMetricsResult } from "@/lib/metrics/types";

import { detailNote, formatDayLabel, MetricsEmpty } from "./metrics-page-header";

function decimal(value: number) {
  return String(value).replace(".", ",");
}

/** Resale-price charts shared by the overview preview and the project case page. */
export function ProjectPricePanels({
  data,
  isPending,
  days,
  caseLabel,
  detail,
}: {
  data: ProjectCaseMetricsResult | undefined;
  isPending: boolean;
  days: number;
  caseLabel: string;
  detail?: { href: string; label: string };
}) {
  const loading = isPending ? "Đang tải…" : null;
  const priceSeries = data
    ? [
        {
          key: data.subjectName,
          color: "#0091FF",
          dotted: true,
          values: data.price.daily.map((day) => day.median),
        },
        ...(data.price.priceRef != null
          ? [
              {
                key: "Giá khởi điểm CĐT",
                color: "var(--muted-foreground)",
                dashed: true,
                values: data.price.daily.map(() => data.price.priceRef),
              },
            ]
          : []),
      ]
    : [];
  const hasPriceLine = data?.price.daily.some((day) => day.median != null) ?? false;
  const medianNote = data
    ? [
        data.price.median.current != null
          ? `Trung vị dự án kỳ này ${decimal(data.price.median.current)} tr/m²`
          : null,
        data.price.median.previous != null
          ? `kỳ trước ${decimal(data.price.median.previous)}`
          : "chưa có kỳ trước",
        data.price.priceRef != null ? `giá khởi điểm ${decimal(data.price.priceRef)}` : null,
        data.price.droppedOutlier
          ? `đã bỏ ${formatCount(data.price.droppedOutlier)} tin lệch mạnh`
          : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : undefined;

  return (
    <>
      <ReportPanel
        title="Giá rao bán lại theo ngày"
        span="s8"
        scope="case"
        scopeLabel={caseLabel}
        note={detailNote(
          medianNote || "Triệu đồng/m², AI trích xuất từ tin rao, đã lọc trùng và tin bất thường",
          detail,
        )}
      >
        {data && hasPriceLine ? (
          <PriceTrendChart
            days={data.price.daily.map((day) => formatDayLabel(day.date))}
            series={priceSeries}
          />
        ) : (
          <MetricsEmpty>
            {loading ??
              `Chưa có giá rao bán (triệu/m²) trong ${days} ngày gần nhất.`}
          </MetricsEmpty>
        )}
      </ReportPanel>
      <ReportPanel
        title="Phân bố giá rao"
        span="s4"
        scope="case"
        scopeLabel={caseLabel}
        note={detailNote(
          data?.price.used ? `${formatCount(data.price.used)} tin rao trong ${days} ngày` : undefined,
          detail,
        )}
      >
        {data?.price.buckets.length ? (
          <PriceBucketChart
            buckets={data.price.buckets.map((bucket) => ({
              name: bucket.label,
              value: bucket.count,
            }))}
          />
        ) : (
          <MetricsEmpty>{loading ?? "Chưa có tin rao để vẽ phân bố."}</MetricsEmpty>
        )}
      </ReportPanel>
    </>
  );
}
