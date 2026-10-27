import { growthPercent } from "@/lib/metrics/formulas";
import type { MetricsValue, OverviewMetricsResult } from "@/lib/metrics/types";
import { formatCount, formatShort, formatSigned, type AquaKpi } from "@/lib/projects/aqua-demo";

// KPI tiles of the Overview, also the key figures of an AI report (D29).

export function decimal(value: number | string) {
  return String(value).replace(".", ",");
}

/** Change in % for counts; "Chưa có kỳ trước" when the period before is empty. */
export function countKpi(
  label: string,
  value: MetricsValue,
  tip: string,
  format: (value: number) => string = formatCount,
): AquaKpi {
  const growth = growthPercent(value.current, value.previous);
  return {
    label,
    value: format(value.current),
    delta: growth === null ? "Chưa có kỳ trước" : `${decimal(formatSigned(growth))}%`,
    good: growth === null || growth >= 0,
    tip,
  };
}

/** Change in points for scores and shares; `higherIsBetter` colours the change. */
export function pointKpi(
  label: string,
  value: MetricsValue<number | null>,
  tip: string,
  { suffix = "", higherIsBetter = true, signed = false } = {},
): AquaKpi {
  const show = (number: number) => decimal(signed ? formatSigned(number) : number) + suffix;
  const change =
    value.current === null || value.previous === null
      ? null
      : Math.round((value.current - value.previous) * 10) / 10;
  return {
    label,
    value: value.current === null ? "—" : show(value.current),
    delta:
      change === null
        ? "Chưa có kỳ trước"
        : `${decimal(formatSigned(change))} điểm`,
    good: change === null || (higherIsBetter ? change >= 0 : change <= 0),
    tip,
  };
}

export function buildKpis(
  data: Pick<
    OverviewMetricsResult,
    "mentions" | "engagement" | "uniqueAuthors" | "nss" | "negativeShare"
  >,
): AquaKpi[] {
  return [
    countKpi("Lượt đề cập", data.mentions, "Bài đăng, bình luận, trả lời có liên quan"),
    countKpi("Tương tác", data.engagement, "Tổng lượt thích, bình luận, chia sẻ", formatShort),
    countKpi("Tác giả", data.uniqueAuthors, "Số người khác nhau viết đề cập"),
    pointKpi("Chỉ số cảm xúc (NSS)", data.nss, "(Tích cực − Tiêu cực) / Tổng đề cập đã phân loại × 100", {
      signed: true,
    }),
    pointKpi("Tỷ lệ tiêu cực", data.negativeShare, "Phần trăm đề cập tiêu cực trên tổng đề cập đã phân loại", {
      suffix: "%",
      higherIsBetter: false,
    }),
  ];
}
