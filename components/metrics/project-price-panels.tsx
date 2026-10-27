"use client";

import { PriceBucketChart, PriceTrendChart } from "@/components/metrics/report-ui/report-charts";
import { ReportPanel } from "@/components/metrics/report-ui/report-ui";
import { formatCount } from "@/lib/projects/aqua-demo";
import type { PriceDistributionReport, PriceTrendReport, ReportResult } from "@/lib/metrics/types";

import { detailNote, formatDayLabel, MetricsEmpty } from "./metrics-page-header";

function decimal(value: number) {
  return String(value).replace(".", ",");
}

type PanelProps<T> = {
  report: ReportResult<T> | undefined;
  isPending: boolean;
  days: number;
  caseLabel: string;
  /** Link to the case page, on the overview preview. */
  detail?: { href: string; label: string };
};

/** Daily median of resale quotes against the reference price (`price-trend`). */
export function PriceTrendPanel({
  report,
  isPending,
  days,
  caseLabel,
  detail,
  subjectName,
}: PanelProps<PriceTrendReport> & { subjectName: string }) {
  const data = report?.data;
  const series = data
    ? [
        {
          key: subjectName,
          color: "#0091FF",
          dotted: true,
          values: data.daily.map((day) => day.median),
        },
        ...(data.priceRef != null
          ? [
              {
                key: "Giá khởi điểm CĐT",
                color: "var(--muted-foreground)",
                dashed: true,
                values: data.daily.map(() => data.priceRef),
              },
            ]
          : []),
      ]
    : [];
  const hasLine = data?.daily.some((day) => day.median != null) ?? false;
  const medianNote = data
    ? [
        data.median.current != null
          ? `Trung vị dự án kỳ này ${decimal(data.median.current)} tr/m²`
          : null,
        data.median.previous != null ? `kỳ trước ${decimal(data.median.previous)}` : "chưa có kỳ trước",
        data.priceRef != null ? `giá khởi điểm ${decimal(data.priceRef)}` : null,
        data.droppedOutlier ? `đã bỏ ${formatCount(data.droppedOutlier)} tin lệch mạnh` : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : undefined;

  return (
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
      {data && hasLine ? (
        <PriceTrendChart days={data.daily.map((day) => formatDayLabel(day.date))} series={series} />
      ) : (
        <MetricsEmpty>
          {isPending ? "Đang tải…" : `Chưa có giá rao bán (triệu/m²) trong ${days} ngày gần nhất.`}
        </MetricsEmpty>
      )}
    </ReportPanel>
  );
}

/** Kept resale quotes of the period in price buckets (`price-distribution`). */
export function PriceDistributionPanel({
  report,
  isPending,
  days,
  caseLabel,
  detail,
}: PanelProps<PriceDistributionReport>) {
  const data = report?.data;

  return (
    <ReportPanel
      title="Phân bố giá rao"
      span="s4"
      scope="case"
      scopeLabel={caseLabel}
      note={detailNote(data?.used ? `${formatCount(data.used)} tin rao trong ${days} ngày` : undefined, detail)}
    >
      {data?.buckets.length ? (
        <PriceBucketChart
          buckets={data.buckets.map((bucket) => ({ name: bucket.label, value: bucket.count }))}
        />
      ) : (
        <MetricsEmpty>{isPending ? "Đang tải…" : "Chưa có tin rao để vẽ phân bố."}</MetricsEmpty>
      )}
    </ReportPanel>
  );
}
