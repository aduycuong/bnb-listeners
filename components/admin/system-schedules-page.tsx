"use client";

import { useQuery } from "@tanstack/react-query";
import { RefreshCwIcon } from "lucide-react";

import {
  authMeQueryKey,
  systemScheduleRunsQueryKey,
  systemSchedulesQueryKey,
} from "@/components/admin/admin-query-keys";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getCronFriendlyText } from "@/lib/common/cron-presets";
import type {
  ListSystemScheduleRunsResult,
  ListSystemSchedulesResult,
} from "@/lib/system-schedules/types";
import { cn } from "@/lib/utils";

async function fetchSystemSchedules(): Promise<ListSystemSchedulesResult> {
  const res = await fetch("/api/admin/system-schedules");
  const data = (await res.json()) as ListSystemSchedulesResult & {
    error?: string;
    message?: string;
  };

  if (!res.ok) {
    throw new Error(data.message ?? data.error ?? "Could not load schedules.");
  }

  return data;
}

async function fetchSystemScheduleRuns(
  systemScheduleId: string,
): Promise<ListSystemScheduleRunsResult> {
  const res = await fetch(`/api/admin/system-schedules/${systemScheduleId}/runs`);
  const data = (await res.json()) as ListSystemScheduleRunsResult & {
    error?: string;
    message?: string;
  };

  if (!res.ok) {
    throw new Error(data.message ?? data.error ?? "Could not load run logs.");
  }

  return data;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatDuration(startedAt: string, finishedAt: string | null) {
  if (!finishedAt) {
    return "In progress";
  }

  const ms = new Date(finishedAt).getTime() - new Date(startedAt).getTime();
  if (ms < 1000) {
    return `${ms}ms`;
  }

  const seconds = Math.round(ms / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

function statusBadgeClassName(status: string) {
  switch (status) {
    case "success":
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
    case "failed":
      return "bg-destructive/10 text-destructive";
    case "running":
      return "bg-amber-500/10 text-amber-700 dark:text-amber-400";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function formatResultSummary(result: Record<string, unknown> | null) {
  if (!result) {
    return null;
  }

  const parts: string[] = [];
  if (typeof result.rowsClaimed === "number") {
    parts.push(`${result.rowsClaimed} claimed`);
  }
  if (typeof result.rowsProcessed === "number") {
    parts.push(`${result.rowsProcessed} processed`);
  }
  if (typeof result.durationMs === "number") {
    parts.push(`${result.durationMs}ms`);
  }

  return parts.length > 0 ? parts.join(" · ") : JSON.stringify(result);
}

type ScheduleRunsPanelProps = {
  scheduleId: string;
  jobName: string;
};

function ScheduleRunsPanel({ scheduleId, jobName }: ScheduleRunsPanelProps) {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: systemScheduleRunsQueryKey(scheduleId),
    queryFn: () => fetchSystemScheduleRuns(scheduleId),
  });

  const items = data?.items ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Run logs</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void refetch()}
          disabled={isFetching}
        >
          <RefreshCwIcon
            className={cn("size-3.5", isFetching && "animate-spin")}
          />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-destructive">{error.message}</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No runs logged yet for {jobName}. Runs appear after QStash fires or a
          manual trigger.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border/50">
          {items.map((run) => (
            <li key={run.id} className="space-y-2 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium capitalize",
                      statusBadgeClassName(run.status),
                    )}
                  >
                    {run.status}
                  </span>
                  <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium capitalize text-muted-foreground">
                    {run.trigger}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDuration(run.startedAt, run.finishedAt)}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatDateTime(run.startedAt)}
                </span>
              </div>
              {formatResultSummary(run.result) ? (
                <p className="text-xs text-muted-foreground">
                  {formatResultSummary(run.result)}
                </p>
              ) : null}
              {run.error ? (
                <p className="text-sm text-destructive">{run.error}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function SystemSchedulesPage() {
  const {
    data,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: systemSchedulesQueryKey,
    queryFn: fetchSystemSchedules,
  });

  const schedules = data?.items ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">System schedules</h2>
          <p className="text-sm text-muted-foreground">
            Global QStash cron jobs and their execution history.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void refetch()}
          disabled={isFetching}
        >
          <RefreshCwIcon
            className={cn("size-3.5", isFetching && "animate-spin")}
          />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, index) => (
            <Skeleton key={index} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-destructive">{error.message}</p>
      ) : schedules.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-sm text-muted-foreground">
              No system schedules found. Run{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                npm run db:seed-system-schedules -- --yes
              </code>{" "}
              then sync QStash schedules.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {schedules.map((schedule) => {
            const cronLabel = schedule.cronConfig.cron.trim()
              ? getCronFriendlyText(schedule.cronConfig.cron)
              : "No cron";

            return (
              <Card key={schedule.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle>{schedule.scheduleId}</CardTitle>
                      <CardDescription>{schedule.description}</CardDescription>
                    </div>
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium",
                        schedule.enabled
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {schedule.enabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <dl className="grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-muted-foreground">Job name</dt>
                      <dd className="font-medium">{schedule.jobName}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Schedule</dt>
                      <dd className="font-medium">{cronLabel}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Timezone</dt>
                      <dd className="font-medium">
                        {schedule.cronConfig.timezone}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Updated</dt>
                      <dd className="font-medium">
                        {formatDateTime(schedule.updatedAt)}
                      </dd>
                    </div>
                  </dl>
                  <ScheduleRunsPanel
                    scheduleId={schedule.id}
                    jobName={schedule.jobName}
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
