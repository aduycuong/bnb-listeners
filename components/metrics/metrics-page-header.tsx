"use client";

import type { ReactNode } from "react";

import { MentionFilterSelect } from "@/components/mentions/mention-filter-select";
import { METRICS_CONFIG } from "@/lib/metrics/config";

/** Title and the period select shared by every number on a metrics page. */
export function MetricsPageHeader({
  title,
  subtitle,
  days,
  onDaysChange,
  loading,
  actions,
}: {
  title: string;
  subtitle: string;
  days: number;
  onDaysChange: (days: number) => void;
  loading: boolean;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-heading text-xl font-bold tracking-tight">{title}</h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          {subtitle}
          {loading ? " · đang tải…" : ""}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <MentionFilterSelect
          label="Khoảng thời gian"
          value={String(days)}
          options={METRICS_CONFIG.reportPeriodDays.map((value) => ({
            value: String(value),
            label: `${value} ngày gần nhất`,
          }))}
          onChange={(value) => onDaysChange(Number(value))}
        />
        {actions}
      </div>
    </div>
  );
}

/** `2026-10-05` → `5/10`, like the demo's day axis. */
export function formatDayLabel(date: string) {
  const [, month, day] = date.split("-");
  return `${Number(day)}/${Number(month)}`;
}

export function MetricsEmpty({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl bg-muted px-3 py-6 text-center text-sm text-muted-foreground">
      {children}
    </p>
  );
}
