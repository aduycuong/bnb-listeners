import { useT } from "next-i18next/client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  DashboardUsage,
  DashboardUsageItem,
  GetDashboardOverviewResult,
} from "@/lib/dashboard/types";
import { cn } from "@/lib/utils";

type DashboardUsageCardProps = {
  data?: GetDashboardOverviewResult;
  isLoading?: boolean;
};

const USAGE_KEYS = [
  "projects",
  "members",
  "sources",
  "analyzedMentions",
  "apiKeys",
] as const satisfies readonly (keyof DashboardUsage)[];

function UsageRow({ label, item }: { label: string; item: DashboardUsageItem }) {
  const { t } = useT("dashboard");
  const ratio = item.limit ? item.used / item.limit : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span>{label}</span>
        <span className="tabular-nums text-muted-foreground">
          {item.used.toLocaleString()} /{" "}
          {item.limit === null
            ? t("overview.usage.unlimited")
            : item.limit.toLocaleString()}
        </span>
      </div>
      {item.limit !== null ? (
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={item.limit}
          aria-valuenow={Math.min(item.used, item.limit)}
          aria-label={label}
          className="h-2 overflow-hidden rounded-full bg-muted"
        >
          <div
            className={cn(
              "h-full rounded-full",
              ratio >= 0.9 ? "bg-destructive" : "bg-primary",
            )}
            style={{ width: `${Math.min(ratio, 1) * 100}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}

export function DashboardUsageCard({
  data,
  isLoading = false,
}: DashboardUsageCardProps) {
  const { t } = useT("dashboard");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("overview.usage.title")}</CardTitle>
        {data ? (
          <CardDescription>
            {t("overview.usage.description", { plan: data.usage.planName })}
          </CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading || !data ? (
          <Skeleton className="h-40 w-full rounded-lg" />
        ) : (
          USAGE_KEYS.map((key) => (
            <UsageRow
              key={key}
              label={t(`overview.usage.${key}`)}
              item={data.usage[key]}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}
