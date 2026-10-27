"use client";

import type { ReactNode } from "react";

import { formatSigned } from "@/lib/projects/aqua-demo";
import { cn } from "@/lib/utils";

import { decimal } from "../overview-kpis";
import {
  competitorMean,
  COMPETITOR_MEAN_LABEL,
  type Cell,
  type CompareMemberBase,
} from "./compare-members";

export type CompareRow<M extends CompareMemberBase> = {
  label: ReactNode;
  read: (member: M) => Cell;
  format: (value: number) => string;
  /** Colors the gap with the competitors; left out when higher is neither better nor worse. */
  higherIsBetter?: boolean;
  /** False when the competitors' mean says nothing (e.g. shares of a whole). */
  mean?: false;
  /** Unit of the gap, e.g. " điểm" for shares and NSS. */
  gapUnit?: string;
};

/** The primary project minus the competitors' mean, when both exist. */
export function compareGap<M extends CompareMemberBase>(members: M[], row: CompareRow<M>): Cell {
  const primary = members.find((member) => member.primary);
  const mean = competitorMean(members, row.read);
  const value = primary ? row.read(primary) : null;
  return value === null || mean === null ? null : Math.round((value - mean) * 10) / 10;
}

export function formatGap(gap: number, unit = "") {
  return `${decimal(formatSigned(gap))}${unit}`;
}

function show(value: Cell, format: (value: number) => string) {
  return value === null ? "—" : format(value);
}

/**
 * Projects as columns, the primary first, then the competitors' mean and the primary's gap
 * with it (D30). Rows are metrics or aspects.
 */
export function CompareTable<M extends CompareMemberBase>({
  members,
  rows,
  rowHeader = "Chỉ số",
}: {
  members: M[];
  rows: CompareRow<M>[];
  rowHeader?: string;
}) {
  const hasCompetitors = members.some((member) => !member.primary);

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-border text-left text-muted-foreground">
            <th className="px-2 py-2 font-semibold">{rowHeader}</th>
            {members.map((member) => (
              <th key={member.id} className="px-2 py-2 text-right font-semibold">
                <span className="inline-flex items-center gap-1.5">
                  <i className="size-2.5 rounded-full" style={{ background: member.color }} />
                  <span className={cn(member.primary && "text-foreground")}>
                    {member.primary ? `★ ${member.name}` : member.name}
                  </span>
                </span>
              </th>
            ))}
            {hasCompetitors ? (
              <>
                <th className="px-2 py-2 text-right font-semibold">{COMPETITOR_MEAN_LABEL}</th>
                <th className="px-2 py-2 text-right font-semibold">Chênh lệch</th>
              </>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const gap = row.mean === false ? null : compareGap(members, row);
            return (
              <tr key={index} className="border-b border-border/70 last:border-0">
                <td className="px-2 py-2">{row.label}</td>
                {members.map((member) => (
                  <td
                    key={member.id}
                    className={cn("px-2 py-2 text-right tabular-nums", member.primary && "font-semibold")}
                  >
                    {show(row.read(member), row.format)}
                  </td>
                ))}
                {hasCompetitors ? (
                  <>
                    <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">
                      {row.mean === false ? "—" : show(competitorMean(members, row.read), row.format)}
                    </td>
                    <td
                      className={cn(
                        "px-2 py-2 text-right font-semibold tabular-nums",
                        gap !== null && gap !== 0 && row.higherIsBetter !== undefined
                          ? (gap > 0) === row.higherIsBetter
                            ? "text-[var(--positive)]"
                            : "text-[var(--negative)]"
                          : "text-muted-foreground",
                      )}
                    >
                      {gap === null ? "—" : formatGap(gap, row.gapUnit)}
                    </td>
                  </>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
