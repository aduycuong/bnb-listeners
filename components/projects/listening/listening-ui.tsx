import type { SentimentKey } from "@/lib/projects/listening-demo-data";
import { cn } from "@/lib/utils";

export const SENTIMENT_META: Record<
  SentimentKey,
  { label: string; color: string; badge: string; text: string }
> = {
  negative: {
    label: "Tiêu cực",
    color: "oklch(0.62 0.17 25)",
    badge: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
    text: "text-rose-700 dark:text-rose-400",
  },
  neutral: {
    label: "Trung tính",
    color: "oklch(0.62 0.03 250)",
    badge: "bg-muted text-muted-foreground",
    text: "text-muted-foreground",
  },
  positive: {
    label: "Tích cực",
    color: "oklch(0.62 0.13 155)",
    badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    text: "text-emerald-700 dark:text-emerald-400",
  },
};

export function formatCount(value: number) {
  return value.toLocaleString("vi-VN");
}

export function formatCompact(value: number) {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString("vi-VN", {
      maximumFractionDigits: 1,
    })} triệu`;
  }

  return formatCount(value);
}

export function formatSignedPercent(value: number) {
  const rounded = Math.round(value);
  return `${rounded > 0 ? "+" : ""}${rounded}%`;
}

export function formatSignedPoints(value: number) {
  const rounded = Math.round(value);
  return `${rounded > 0 ? "+" : ""}${rounded} điểm`;
}

export function formatShare(value: number) {
  return `${value.toLocaleString("vi-VN", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}

export function sentimentTone(net: number): SentimentKey | "balanced" {
  if (net <= -8) {
    return "negative";
  }
  if (net >= 8) {
    return "positive";
  }
  return "balanced";
}

export function sentimentHeadline(net: number) {
  const tone = sentimentTone(net);
  if (tone === "negative") {
    return "Nghiêng tiêu cực";
  }
  if (tone === "positive") {
    return "Nghiêng tích cực";
  }
  return "Gần cân bằng";
}

export function MixBar({
  segments,
}: {
  segments: { value: number; color: string; label: string }[];
}) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0) || 1;

  return (
    <div className="flex h-1.5 overflow-hidden rounded-full bg-muted">
      {segments.map((segment) => (
        <div
          key={segment.label}
          className="h-full"
          style={{
            width: `${(segment.value / total) * 100}%`,
            backgroundColor: segment.color,
          }}
        />
      ))}
    </div>
  );
}

export function ShareList({
  items,
}: {
  items: { name: string; value: number }[];
}) {
  const total = items.reduce((sum, item) => sum + item.value, 0) || 1;

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const percent = Math.round((item.value / total) * 100);

        return (
          <div key={item.name} className="space-y-1">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span>{item.name}</span>
              <span className="tabular-nums text-muted-foreground">
                {percent}%
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-foreground/70"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function DeltaText({
  children,
  tone = "neutral",
}: {
  children: string;
  tone?: "up" | "down" | "neutral";
}) {
  return (
    <span
      className={cn(
        "text-xs font-medium tabular-nums",
        tone === "up" && "text-emerald-700 dark:text-emerald-400",
        tone === "down" && "text-rose-700 dark:text-rose-400",
        tone === "neutral" && "text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}

export function sentimentSegments(counts: Record<SentimentKey, number>) {
  return (["negative", "neutral", "positive"] as const).map((key) => ({
    label: SENTIMENT_META[key].label,
    value: counts[key],
    color: SENTIMENT_META[key].color,
  }));
}

export function initials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}
