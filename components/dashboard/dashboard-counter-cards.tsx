import { DatabaseIcon, LinkIcon, TrendingUpIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { GetDashboardOverviewResult } from "@/lib/dashboard/types";

type DashboardCounterCardsProps = {
  data?: GetDashboardOverviewResult;
  isLoading?: boolean;
};

type StatCardProps = {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
};

function StatCard({ label, value, sub, icon }: StatCardProps) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-4 pt-5">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold tabular-nums tracking-tight">
            {value}
          </p>
          {sub ? (
            <p className="text-xs text-muted-foreground">{sub}</p>
          ) : null}
        </div>
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardCounterCards({
  data,
  isLoading = false,
}: DashboardCounterCardsProps) {
  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
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

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <StatCard
        label="Total documents"
        value={data.totalDocuments.toLocaleString()}
        icon={<DatabaseIcon className="size-5 text-muted-foreground" />}
      />
      <StatCard
        label="New documents"
        value={data.newDocumentsLast30Days.toLocaleString()}
        sub="Last 30 days"
        icon={<TrendingUpIcon className="size-5 text-muted-foreground" />}
      />
      <StatCard
        label="Sources"
        value={data.totalJobs.toLocaleString()}
        sub="Scrape jobs"
        icon={<LinkIcon className="size-5 text-muted-foreground" />}
      />
    </div>
  );
}
