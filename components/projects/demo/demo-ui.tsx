"use client";

import type { ReactNode } from "react";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  formatShort,
  kpiHasOwnCompare,
  type AquaAlertLevel,
  type AquaKpi,
  type AquaSentiment,
} from "@/lib/projects/aqua-demo";
import type { AquaReviewValue } from "@/lib/projects/aqua-demo-profile";

const SPANS = {
  s3: "col-span-12 xl:col-span-3",
  s4: "col-span-12 md:col-span-6 xl:col-span-4",
  s5: "col-span-12 xl:col-span-5",
  s6: "col-span-12 xl:col-span-6",
  s7: "col-span-12 xl:col-span-7",
  s8: "col-span-12 xl:col-span-8",
  s12: "col-span-12",
} as const;

export type DemoSpan = keyof typeof SPANS;

const PILL_CLASS: Record<AquaSentiment | AquaAlertLevel, string> = {
  pos: "bg-[color-mix(in_srgb,var(--pos)_16%,transparent)] text-[#0B8A6B]",
  neu: "border border-border bg-muted text-muted-foreground",
  neg: "bg-[color-mix(in_srgb,var(--neg)_16%,transparent)] text-[#D5402F]",
  high: "bg-[#E5484D] text-white",
  med: "bg-[#FFE08A] text-[#8A5B00]",
  low: "bg-muted text-muted-foreground",
};

export function DemoPage({
  title,
  subtitle,
  banner,
  children,
}: {
  title: string;
  subtitle: string;
  banner: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-7 py-5">
      {banner}
      <div>
        <h1 className="font-heading text-xl font-bold tracking-tight">{title}</h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

export function DemoBanner({
  icon,
  name,
  caseLabel,
  description,
  datasets,
  modeLabel,
  owner,
  showSampleFlag,
  settingsHref,
}: {
  icon: string;
  name: string;
  caseLabel: string;
  description: string;
  datasets: string[];
  modeLabel: string;
  owner: string;
  showSampleFlag: boolean;
  settingsHref: string;
}) {
  return (
    <div className="grid items-center gap-4 rounded-[22px] bg-[var(--tile-blue)] px-5 py-4 text-foreground md:grid-cols-[auto_1fr_auto]">
      <div className="grid size-11 place-items-center rounded-2xl bg-white text-[22px]">
        {icon}
      </div>
      <div className="min-w-0">
        <h2 className="flex flex-wrap items-center gap-2 text-base font-bold">
          {name}
          <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-white">
            Case: {caseLabel}
          </span>
        </h2>
        <p className="mt-0.5 max-w-[85ch] text-[13px] text-muted-foreground">
          {description}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[12.5px] text-muted-foreground">
          <span>Bộ dữ liệu:</span>
          {datasets.map((dataset) => (
            <em
              key={dataset}
              className="rounded-full bg-card px-2 py-0.5 text-[12px] font-semibold text-[var(--tile-blue-foreground)] not-italic"
            >
              {dataset}
            </em>
          ))}
          <span>
            · {modeLabel} · Phụ trách: {owner}
          </span>
        </div>
        {showSampleFlag ? (
          <div className="mt-2 inline-flex rounded-full bg-[var(--tile-sun)] px-2.5 py-1 text-[12px] font-semibold text-[var(--tile-sun-foreground)]">
            Dự án mới tạo: dashboard đang hiển thị dữ liệu minh họa của kiểu case này
          </div>
        ) : null}
      </div>
      <Button
        variant="outline"
        nativeButton={false}
        className="bg-white text-primary hover:bg-white/90"
        render={<Link href={settingsHref} />}
      >
        Cài đặt dự án
      </Button>
    </div>
  );
}

export function DemoKpis({ kpis }: { kpis: AquaKpi[] }) {
  const tiles = [
    "bg-primary text-white",
    "bg-[var(--tile-mint)] text-[var(--tile-mint-foreground)]",
    "bg-[var(--tile-sun)] text-[var(--tile-sun-foreground)]",
    "bg-[var(--tile-blue)] text-[var(--tile-blue-foreground)]",
    "bg-[var(--tile-violet)] text-[#3D348B]",
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
          <div className="mt-1 text-[22px] leading-tight font-bold tracking-tight">
            {kpi.value}
          </div>
          <div
            className={cn(
              "mt-1 text-[12.5px] font-semibold",
              index === 0
                ? "text-white"
                : kpi.good
                  ? "text-[#0B8A6B]"
                  : "text-[#D5402F]",
            )}
          >
            {kpi.delta}
            {kpiHasOwnCompare(kpi.delta) ? null : (
              <span className="ml-1 font-medium opacity-70">vs 14 ngày trước</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export function DemoGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-12 gap-4">{children}</div>;
}

export function DemoPanel({
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
  span: DemoSpan;
  scope: "common" | "case";
  scopeLabel?: string;
  note?: string;
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

export function DemoBars({
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
          className="grid grid-cols-[minmax(90px,140px)_1fr_64px] items-center gap-2.5 text-[13px]"
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

export function DemoTable({
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

export function ReviewValueView({ value }: { value: AquaReviewValue }) {
  if (value.type === "text") {
    return value.text ? (
      <span>{value.text}</span>
    ) : (
      <span className="text-muted-foreground">—</span>
    );
  }

  if (value.type === "tags") {
    return (
      <span className="flex flex-wrap gap-1.5">
        {value.tags.map((tag) => (
          <span
            key={tag.text}
            className={cn(
              "rounded-full px-2 py-0.5 text-[12px] font-semibold",
              tag.excluded
                ? "bg-[var(--tile-coral)] text-[var(--tile-coral-foreground)]"
                : "bg-[var(--tile-blue)] text-[var(--tile-blue-foreground)]",
            )}
          >
            {tag.text}
          </span>
        ))}
      </span>
    );
  }

  if (value.type === "datasets") {
    return (
      <span className="flex w-full flex-col gap-2">
        {value.items.map((item) => (
          <span key={item.name} className="block">
            <b className="block">{item.name}</b>
            <code className="text-[12px] text-muted-foreground">{item.query}</code>
          </span>
        ))}
      </span>
    );
  }

  return (
    <span className="flex w-full flex-col gap-1">
      {value.lines.map((line) => (
        <span key={line}>{line}</span>
      ))}
    </span>
  );
}
