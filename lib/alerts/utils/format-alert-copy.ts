import { formatCount } from "@/lib/projects/aqua-demo";
import { ALERT_WINDOW_LABELS, type AlertWindow } from "@/lib/projects/alert-templates";

function titled(base: string, scopeLabel: string) {
  return scopeLabel === "Toàn project" ? base : `${base} · ${scopeLabel}`;
}

function formatPercent(value: number) {
  const rounded = Math.round(value * 10) / 10;
  return `${rounded.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`;
}

function formatSignedPercent(value: number) {
  const rounded = Math.round(value * 10) / 10;
  const text = formatPercent(Math.abs(rounded));
  if (rounded > 0) return `+${text}`;
  if (rounded < 0) return `-${text}`;
  return text;
}

function windowLabel(window: AlertWindow) {
  return ALERT_WINDOW_LABELS[window];
}

export function volumeAlertCopy(input: {
  scopeLabel: string;
  window: AlertWindow;
  current: number;
  growth: number;
  threshold: number;
}) {
  const growth = formatSignedPercent(input.growth);
  const span = windowLabel(input.window);
  return {
    title: titled(`Lượng thảo luận tăng ${growth}`, input.scopeLabel),
    body: `${formatCount(input.current)} đề cập trong ${span}, ${growth} so với ${span} liền trước (ngưỡng ${formatPercent(input.threshold)}).`,
  };
}

export function negativeShareAlertCopy(input: {
  scopeLabel: string;
  window: AlertWindow;
  share: number;
  classified: number;
  threshold: number;
}) {
  const share = formatPercent(input.share);
  return {
    title: titled(`Tỷ lệ tiêu cực ${share}`, input.scopeLabel),
    body: `${share} tiêu cực trên ${formatCount(input.classified)} đề cập đã phân loại cảm xúc trong ${windowLabel(input.window)} (ngưỡng ${formatPercent(input.threshold)}).`,
  };
}

function keywordList(keywords: string[]) {
  const shown = keywords.slice(0, 3).map((keyword) => `“${keyword}”`).join(", ");
  return keywords.length > 3 ? `${shown}…` : shown;
}

export function keywordAlertCopy(input: {
  scopeLabel: string;
  window: AlertWindow;
  count: number;
  keywords: string[];
  threshold: number;
}) {
  const words = keywordList(input.keywords);
  const title = input.keywords.length === 1
    ? `Từ khóa ${words} · ${formatCount(input.count)} đề cập`
    : `Từ khóa xuất hiện · ${formatCount(input.count)} đề cập`;
  return {
    title: titled(title, input.scopeLabel),
    body: `${formatCount(input.count)} đề cập chứa ${words} trong ${windowLabel(input.window)} (ngưỡng ${formatCount(input.threshold)}).`,
  };
}

export function viralAlertCopy(input: {
  scopeLabel: string;
  engagement: number;
  threshold: number;
  excerpt: string;
}) {
  const engagement = formatCount(input.engagement);
  const base = `Bài đạt ${engagement} lượt tương tác (ngưỡng ${formatCount(input.threshold)}).`;
  return {
    title: titled(`Bài lan rộng · ${engagement} tương tác`, input.scopeLabel),
    body: input.excerpt ? `${base} ${input.excerpt}` : base,
  };
}

export function priceAlertCopy(input: {
  scopeLabel: string;
  amount: number;
  deviation: number;
  priceRef: number;
  threshold: number;
  quoteCount: number;
}) {
  const deviation = formatPercent(input.deviation);
  const amount = formatCount(input.amount);
  const priceRef = formatCount(input.priceRef);
  const body = input.quoteCount === 1
    ? `Giá rao ${amount} tr/m² lệch ${deviation} so với giá tham chiếu ${priceRef} tr/m² (ngưỡng ${formatPercent(input.threshold)}).`
    : `${formatCount(input.quoteCount)} giá rao lệch quá ${formatPercent(input.threshold)} so với giá tham chiếu ${priceRef} tr/m². Lệch nhiều nhất ${amount} tr/m² (${deviation}).`;
  return {
    title: titled(`Giá rao lệch ${deviation}`, input.scopeLabel),
    body,
  };
}

export function questionAlertCopy(input: {
  scopeLabel: string;
  window: AlertWindow;
  current: number;
  growth: number;
  threshold: number;
}) {
  const growth = formatSignedPercent(input.growth);
  const span = windowLabel(input.window);
  return {
    title: titled(`Câu hỏi người mua tăng ${growth}`, input.scopeLabel),
    body: `${formatCount(input.current)} câu hỏi trong ${span}, ${growth} so với ${span} liền trước (ngưỡng ${formatPercent(input.threshold)}).`,
  };
}
