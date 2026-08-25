"use client";

import { useQuery } from "@tanstack/react-query";

import { JobRunButton } from "@/components/jobs/job-run-button";
import { jobRunsQueryKey } from "@/components/jobs/job-query-keys";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { ListJobRunsResult } from "@/lib/jobs/types";
import { cn } from "@/lib/utils";
import { workspaceFetch } from "@/lib/workspaces/utils/workspace-fetch";

type JobRunsSectionProps = {
  workspaceId: string;
  jobId: string;
  canRun?: boolean;
};

async function fetchJobRuns(
  workspaceId: string,
  jobId: string,
): Promise<ListJobRunsResult> {
  const res = await workspaceFetch(workspaceId, `/api/jobs/${jobId}/runs`);
  const data = (await res.json()) as ListJobRunsResult & {
    error?: string;
    message?: string;
  };

  if (!res.ok) {
    throw new Error(data.message ?? data.error ?? "Could not load job runs.");
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

export function JobRunsSection({
  workspaceId,
  jobId,
  canRun = false,
}: JobRunsSectionProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: jobRunsQueryKey(workspaceId, jobId),
    queryFn: () => fetchJobRuns(workspaceId, jobId),
  });

  const items = data?.items ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Run history</CardTitle>
        <CardDescription>
          Recent executions from the schedule or a manual run.
        </CardDescription>
        {canRun ? (
          <CardAction>
            <JobRunButton
              workspaceId={workspaceId}
              jobId={jobId}
              label="Run now"
            />
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{error.message}</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No runs yet. Runs appear here after you run the job or the schedule
            fires.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border/50">
            {items.map((run) => (
              <li key={run.id} className="space-y-2 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium capitalize",
                        statusBadgeClassName(run.status),
                      )}
                    >
                      {run.status}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDuration(run.startedAt, run.finishedAt)}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(run.startedAt)}
                  </span>
                </div>
                {run.error ? (
                  <p className="text-sm text-destructive">{run.error}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
