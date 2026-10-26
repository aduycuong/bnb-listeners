"use client";

import { LockIcon } from "lucide-react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { AdminSourceRow, AdminTierRules } from "@/lib/admin-console/types";

import { formatRelative } from "./admin-format";
import { AdminStatusBadge } from "./admin-status-badge";

type TierSource = Pick<
  AdminSourceRow,
  | "activityTier"
  | "tierMode"
  | "autoTier"
  | "intervalRule"
  | "intervalHours"
  | "postsPerDay"
  | "nextPostRunAt"
  | "dailyRecordLimit"
  | "usedToday"
>;

/** Posts one run is expected to fetch at this rate and interval. */
export function getExpectedPostsPerRun(postsPerDay: number, intervalHours: number): number {
  return Math.round((postsPerDay * intervalHours) / 24);
}

/** What the scheduler does with a source and why, one sentence per line. */
export function describeTierSchedule(source: TierSource, rules: AdminTierRules): string[] {
  const { hot, normal } = rules.minPostsPerDay;
  const rate = `${source.postsPerDay} posts/day over ${rules.windowDays}d`;
  const lines: string[] = [];

  if (source.activityTier === "paused") {
    lines.push("Paused: never scheduled.");
  } else if (source.intervalRule === "search") {
    lines.push(`Keyword search: runs every ${source.intervalHours}h whatever the tier.`);
  } else {
    lines.push(`Scans every ${source.intervalHours}h (${source.activityTier}).`);
  }

  if (source.intervalRule === "tier") {
    if (source.tierMode === "auto") {
      lines.push(`Automatic: ${rate} → ${source.autoTier} (hot ≥ ${hot}, normal ≥ ${normal}).`);
    } else {
      lines.push(
        `Manual tier, kept after post runs. Automatic would be ${source.autoTier} (${rate}).`,
      );
    }
  }

  if (source.nextPostRunAt) {
    lines.push(`Next post run ${formatRelative(source.nextPostRunAt)}.`);
  }

  if (source.dailyRecordLimit !== null && source.usedToday >= source.dailyRecordLimit) {
    lines.push(
      `Daily limit used up (${source.usedToday} / ${source.dailyRecordLimit}): runs and comment collections wait until midnight Vietnam time.`,
    );
  }

  if (source.intervalRule === "tier" && source.intervalHours !== null) {
    const perRun = getExpectedPostsPerRun(source.postsPerDay, source.intervalHours);
    if (perRun > rules.maxRecordsPerRun) {
      lines.push(
        `About ${perRun} posts per run, above the ${rules.maxRecordsPerRun}-record cap: posts may be missed.`,
      );
    }
  }

  return lines;
}

/** Tier badge whose hover text says how often the source runs and why. */
export function AdminTierBadge({
  tier,
  manual,
  lines,
}: {
  tier: string;
  manual?: boolean;
  lines: string[];
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span className="inline-flex cursor-help items-center gap-1">
            <AdminStatusBadge value={tier} />
            {manual ? (
              <LockIcon className="size-3 text-muted-foreground" aria-label="Manual tier" />
            ) : null}
          </span>
        }
      />
      <TooltipContent className="max-w-sm flex-col items-start gap-0.5 text-left">
        {lines.map((line) => (
          <span key={line}>{line}</span>
        ))}
      </TooltipContent>
    </Tooltip>
  );
}
