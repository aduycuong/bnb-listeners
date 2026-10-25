import Link from "next/link";
import { useT } from "next-i18next/client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getProjectNavHref } from "@/lib/dashboard/nav-items";
import type { GetDashboardOverviewResult } from "@/lib/dashboard/types";

type DashboardRecentAlertsProps = {
  workspaceIndex: number;
  data?: GetDashboardOverviewResult;
  isLoading?: boolean;
};

const LEVEL_VARIANTS = {
  high: "destructive",
  med: "secondary",
  low: "outline",
} as const;

export function DashboardRecentAlerts({
  workspaceIndex,
  data,
  isLoading = false,
}: DashboardRecentAlertsProps) {
  const { t, i18n } = useT("dashboard");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("overview.recentAlerts.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading || !data ? (
          <Skeleton className="h-32 w-full rounded-lg" />
        ) : data.recentAlerts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("overview.recentAlerts.empty")}
          </p>
        ) : (
          <ul className="divide-y">
            {data.recentAlerts.map((alert) => {
              const level = alert.level as keyof typeof LEVEL_VARIANTS;
              return (
                <li key={alert.id} className="flex items-start gap-3 py-2.5">
                  <Badge variant={LEVEL_VARIANTS[level] ?? "outline"}>
                    {t(`overview.recentAlerts.level.${level}`, {
                      defaultValue: alert.level,
                    })}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{alert.title}</p>
                    <p className="text-xs text-muted-foreground">
                      <Link
                        href={getProjectNavHref(
                          workspaceIndex,
                          alert.projectIndex,
                          "alerts",
                        )}
                        className="hover:underline"
                      >
                        {alert.projectName}
                      </Link>
                      {" · "}
                      {new Date(alert.triggeredAt).toLocaleString(
                        i18n?.language,
                        { dateStyle: "short", timeStyle: "short" },
                      )}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
