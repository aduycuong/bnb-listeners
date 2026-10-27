"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import {
  formatShort,
  kpiHasOwnCompare,
  type AquaAlertLevel,
  type AquaKpi,
  type AquaSentiment,
} from "@/lib/projects/aqua-demo";

const SPANS = {
  s3: "col-span-12 xl:col-span-3",
  s4: "col-span-12 md:col-span-6 xl:col-span-4",
  s5: "col-span-12 xl:col-span-5",
  s6: "col-span-12 xl:col-span-6",
  s7: "col-span-12 xl:col-span-7",
  s8: "col-span-12 xl:col-span-8",
  s12: "col-span-12",
} as const;

export type ReportSpan = keyof typeof SPANS;

const PILL_CLASS: Record<AquaSentiment | AquaAlertLevel, string> = {
  pos: "bg-[color-mix(in_srgb,var(--pos)_16%,transparent)] text-[#0B8A6B]",
  neu: "border border-border bg-muted text-muted-foreground",
  neg: "bg-[color-mix(in_srgb,var(--neg)_16%,transparent)] text-[#D5402F]",
  high: "bg-[#E5484D] text-white",
  med: "bg-[#FFE08A] text-[#8A5B00]",
  low: "bg-muted text-muted-foreground",
};

export function ReportKpis({
  kpis,
  compareLabel = "vs 14 ngày trước",
}: {
  kpis: AquaKpi[];
  /** Shown after a plain delta such as "+12%". */
  compareLabel?: string;
}) {
  const tiles = [
    "bg-primary text-white",
    "bg-[var(--tile-mint)] text-[var(--tile-mint-foreground)]",
    "bg-[var(--tile-sun)] text-[var(--tile-sun-foreground)]",
    "bg-[var(--tile-blue)] text-[var(--tile-blue-foreground)]",
    "bg-[var(--tile-violet)] text-[var(--tile-violet-foreground)]",
    "bg-[var(--tile-coral)] text-[var(--tile-coral-foreground)]",
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {kpis.map((kpi, index) => (
        <div
          key={kpi.label}
          className={cn("rounded-[22px] px-4 py-3.5", tiles[index])}
        >
          <div
            className={cn(
              "flex items-center gap-1.5 text-[12.5px]",
              index === 0 ? "text-white/85" : "opacity-80",
            )}
          >
            {kpi.label}
            <span
              title={kpi.tip}
              className="grid size-3.5 place-items-center rounded-full border border-current text-[9px] leading-none"
            >
              i
            </span>
          </div>
          <div className="mt-1 text-2xl leading-tight font-bold tracking-tight">
            {kpi.value}
          </div>
          <div
            className={cn(
              "mt-1 text-[12.5px] font-semibold",
              index === 0
                ? "text-white"
                : kpi.good
                  ? "text-[var(--positive)]"
                  : "text-[var(--negative)]",
            )}
          >
            {kpi.delta}
            {kpiHasOwnCompare(kpi.delta) ? null : (
              <span className="ml-1 font-medium opacity-70">{compareLabel}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ReportGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-12 gap-4">{children}</div>;
}

export function ReportPanel({
  title,
  span,
  scope,
  scopeLabel,
  note,
  invert = false,
  children,
  className,
}: {
  title: string;
  span: ReportSpan;
  scope: "common" | "case";
  scopeLabel?: string;
  note?: ReactNode;
  invert?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "flex min-w-0 flex-col rounded-[22px] border-[1.5px] border-border bg-card px-[18px] pt-[18px] pb-4",
        SPANS[span],
        invert && "border-0 bg-[#0B2545] text-white",
        className,
      )}
    >
      <div className="mb-3 flex flex-wrap items-start gap-2">
        <h3 className="font-heading text-[14.5px] font-bold">{title}</h3>
        <span
          className={cn(
            "ml-auto rounded-full px-2 py-0.5 text-[11px] font-semibold",
            invert
              ? "bg-white/10 text-[#BFD6EE]"
              : scope === "case"
                ? "bg-[var(--tile-sun)] text-[var(--tile-sun-foreground)]"
                : "bg-muted text-muted-foreground",
          )}
        >
          {scope === "case" ? `Riêng case: ${scopeLabel}` : "Dùng chung"}
        </span>
        {note ? (
          <p className="w-full text-xs text-muted-foreground">{note}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function ReportBars({
  rows,
  suffix = "",
}: {
  rows: { label: string; value: number; display?: string }[];
  suffix?: string;
}) {
  const max = Math.max(...rows.map((row) => row.value), 1);

  return (
    <div className="flex flex-col gap-2.5">
      {rows.map((row) => (
        <div
          key={row.label}
          className="grid grid-cols-[minmax(0,42%)_minmax(0,1fr)_auto] items-center gap-2.5 text-[13px]"
        >
          <span className="truncate">{row.label}</span>
          <div className="h-[9px] overflow-hidden rounded-full bg-muted">
            <i
              className="block h-full rounded-full bg-primary"
              style={{ width: `${(row.value / max) * 100}%` }}
            />
          </div>
          <b className="text-right font-semibold">
            {row.display ?? `${formatShort(row.value)}${suffix}`}
          </b>
        </div>
      ))}
    </div>
  );
}

export function SentimentPill({
  sentiment,
  label,
}: {
  sentiment: AquaSentiment | AquaAlertLevel;
  label: string;
}) {
  return (
    <span
      className={cn(
        "inline-block rounded-full px-2 py-0.5 text-[11.5px] font-semibold whitespace-nowrap",
        PILL_CLASS[sentiment],
      )}
    >
      {label}
    </span>
  );
}

export function ReportTable({
  headers,
  rows,
}: {
  headers: { label: string; numeric?: boolean }[];
  rows: ReactNode[][];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-border text-left text-muted-foreground">
            {headers.map((header) => (
              <th
                key={header.label}
                className={cn(
                  "px-2 py-2 font-semibold",
                  header.numeric && "text-right",
                )}
              >
                {header.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-b border-border/70 last:border-0">
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className={cn(
                    "px-2 py-2 align-top",
                    headers[cellIndex]?.numeric && "text-right tabular-nums",
                  )}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
