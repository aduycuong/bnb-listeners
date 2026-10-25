import {
  BellIcon,
  MessageSquareTextIcon,
  SmileIcon,
  ThumbsDownIcon,
} from "lucide-react";
import { useT } from "next-i18next/client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { GetDashboardOverviewResult } from "@/lib/dashboard/types";
import { growthPercent } from "@/lib/metrics/formulas";
import { cn } from "@/lib/utils";

type DashboardKpiCardsProps = {
  data?: GetDashboardOverviewResult;
  isLoading?: boolean;
};

type StatCardProps = {
  label: string;
  value: string;
  sub?: string;
  /** Change against the period before; `goodWhenUp` decides the color. */
  delta?: { text: string; positive: boolean } | null;
  icon: React.ReactNode;
};

function StatCard({ label, value, sub, delta, icon }: StatCardProps) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-4 pt-5">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold tabular-nums tracking-tight">
            {value}
          </p>
          <p className="text-xs text-muted-foreground">
            {delta ? (
              <span
                className={cn(
                  "mr-1 font-medium",
                  delta.positive
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-destructive",
                )}
              >
                {delta.text}
              </span>
            ) : null}
            {sub}
          </p>
        </div>
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

function signed(value: number, suffix = "") {
  return `${value > 0 ? "+" : ""}${value.toLocaleString()}${suffix}`;
}

export function DashboardKpiCards({
  data,
  isLoading = false,
}: DashboardKpiCardsProps) {
  const { t } = useT("dashboard");

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-5">
              <Skeleton className="mb-2 h-4 w-28" />
              <Skeleton className="h-8 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const { totals, periodDays } = data;
  const vsPrevious = t("overview.vsPrevious", { days: periodDays });
  const mentionsGrowth = growthPercent(totals.mentions, totals.previousMentions);
  const nssChange =
    totals.nss !== null && totals.previousNss !== null
      ? totals.nss - totals.previousNss
      : null;
  const noData = t("overview.kpi.noData");

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label={t("overview.kpi.mentions")}
        value={totals.mentions.toLocaleString()}
        delta={
          mentionsGrowth === null
            ? null
            : { text: signed(mentionsGrowth, "%"), positive: mentionsGrowth >= 0 }
        }
        sub={vsPrevious}
        icon={<MessageSquareTextIcon className="size-5 text-muted-foreground" />}
      />
      <StatCard
        label={t("overview.kpi.nss")}
        value={totals.nss === null ? "—" : signed(totals.nss)}
        delta={
          nssChange === null
            ? null
            : { text: signed(nssChange), positive: nssChange >= 0 }
        }
        sub={totals.nss === null ? noData : vsPrevious}
        icon={<SmileIcon className="size-5 text-muted-foreground" />}
      />
      <StatCard
        label={t("overview.kpi.negativeShare")}
        value={
          totals.negativeShare === null ? "—" : `${totals.negativeShare}%`
        }
        sub={totals.negativeShare === null ? noData : undefined}
        icon={<ThumbsDownIcon className="size-5 text-muted-foreground" />}
      />
      <StatCard
        label={t("overview.kpi.alerts")}
        value={totals.alerts.toLocaleString()}
        sub={t("overview.kpi.alertsSub", { count: totals.projects })}
        icon={<BellIcon className="size-5 text-muted-foreground" />}
      />
    </div>
  );
}
