"use client";

import { useState } from "react";
import Link from "next/link";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  AdminSchedulerState,
  ListWorkflowRunsParams,
  ListWorkflowRunsResult,
} from "@/lib/admin-console/types";
import { getCronFriendlyText } from "@/lib/common/cron-presets";

import { AdminFilterSelect } from "./admin-filter-select";
import { formatDateTime, formatDuration, formatNumber, formatRelative } from "./admin-format";
import { AdminJsonBlock } from "./admin-json-block";
import { AdminKeyValues } from "./admin-key-values";
import { AdminQueryState } from "./admin-query-state";
import { adminQueryKeys } from "./admin-query-keys";
import { AdminSection } from "./admin-section";
import { AdminStatusBadge } from "./admin-status-badge";
import { fetchAdminJson } from "./fetch-admin-json";

type WorkflowName = ListWorkflowRunsParams["workflow"];

const WORKFLOWS: WorkflowName[] = ["schedule-collections", "collect-source"];

function SchedulerConfig({ state }: { state: AdminSchedulerState }) {
  return (
    <AdminSection
      title="Scheduler"
      description="Changes go through scripts: npm run schedules:sync, lib/connectors/config.ts."
    >
      <AdminKeyValues
        items={[
          ["Tick interval", `${state.config.intervalMinutes} min`],
          [
            "Post run interval by tier",
            Object.entries(state.config.tierIntervalHours)
              .map(([tier, hours]) => `${tier} ${hours}h`)
              .join(" · "),
          ],
          [
            "Comment refresh checkpoints",
            state.config.checkpointsHours.map((hours) => `+${hours}h`).join(" · "),
          ],
        ]}
      />
    </AdminSection>
  );
}

function QStashSchedules({ state }: { state: AdminSchedulerState }) {
  return (
    <AdminSection title="QStash schedules">
      {state.schedulesError ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.schedulesError}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Schedule</TableHead>
              <TableHead>Cron (UTC)</TableHead>
              <TableHead>Destination</TableHead>
              <TableHead>State</TableHead>
              <TableHead>Last run</TableHead>
              <TableHead>Next run</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {state.schedules.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground">
                  No schedules. Automatic collection is off (npm run schedules:sync -- --yes).
                </TableCell>
              </TableRow>
            ) : (
              state.schedules.map((schedule) => (
                <TableRow key={schedule.scheduleId}>
                  <TableCell className="font-medium">{schedule.scheduleId}</TableCell>
                  <TableCell className="text-xs">
                    <code>{schedule.cron}</code>
                    <div className="text-muted-foreground">{getCronFriendlyText(schedule.cron)}</div>
                  </TableCell>
                  <TableCell className="max-w-72 truncate text-xs">{schedule.destination}</TableCell>
                  <TableCell>
                    <AdminStatusBadge value={schedule.isPaused ? "paused" : "running"} />
                  </TableCell>
                  <TableCell className="text-xs">
                    {formatDateTime(schedule.lastScheduleTime)}
                    <div className="text-muted-foreground">{formatRelative(schedule.lastScheduleTime)}</div>
                  </TableCell>
                  <TableCell className="text-xs">
                    {formatDateTime(schedule.nextScheduleTime)}
                    <div className="text-muted-foreground">{formatRelative(schedule.nextScheduleTime)}</div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}
    </AdminSection>
  );
}

function NextTick({ state }: { state: AdminSchedulerState }) {
  const { sources, budgets, refreshes } = state.nextTick;
  const budgetBySource = new Map(budgets.map((budget) => [budget.sourceId, budget]));

  return (
    <AdminSection
      title="Next tick (dry run)"
      description={`What schedule-collections would start now: ${formatNumber(
        sources.filter((source) => source.status === "due").length,
      )} post runs, ${formatNumber(refreshes.due)} due refresh checkpoints in ${formatNumber(
        refreshes.runs.length,
      )} refresh runs.`}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Source</TableHead>
            <TableHead>Tier</TableHead>
            <TableHead>Last post run</TableHead>
            <TableHead>Decision</TableHead>
            <TableHead className="text-right">Max records</TableHead>
            <TableHead className="text-right">Budget left</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sources.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-muted-foreground">
                No scheduled sources (a source joins after its first manual post run).
              </TableCell>
            </TableRow>
          ) : (
            sources.map((source) => {
              const budget = budgetBySource.get(source.sourceId);
              return (
                <TableRow key={source.sourceId}>
                  <TableCell>
                    <Link href={`/admin/sources/${source.sourceId}`} className="hover:underline">
                      {source.name ?? source.sourceId}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <AdminStatusBadge value={source.activityTier} />
                  </TableCell>
                  <TableCell className="text-xs">
                    {formatDateTime(source.lastRunAt)} · {formatRelative(source.lastRunAt)}
                  </TableCell>
                  <TableCell>
                    <AdminStatusBadge value={source.status} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(source.maxRecords)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {budget ? `${formatNumber(budget.remaining)} / ${formatNumber(budget.limit)}` : "∞"}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </AdminSection>
  );
}

function WorkflowRuns() {
  const [workflow, setWorkflow] = useState<WorkflowName>("schedule-collections");
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, isPending, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: adminQueryKeys.workflowRuns(workflow),
      queryFn: ({ pageParam }) =>
        fetchAdminJson<ListWorkflowRunsResult>("/api/admin/scheduler/workflow-runs", {
          workflow,
          cursor: pageParam,
        }),
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (last) => last.cursor ?? undefined,
      refetchInterval: 60_000,
    });

  const runs = data?.pages.flatMap((page) => page.runs) ?? [];

  return (
    <AdminSection
      title="Workflow runs"
      description="From the Upstash Workflow logs API."
      actions={
        <AdminFilterSelect
          label="workflows"
          value={workflow}
          options={WORKFLOWS}
          onChange={(value) => setWorkflow((value || "schedule-collections") as WorkflowName)}
        />
      }
    >
      {!data ? (
        <AdminQueryState isPending={isPending} error={error} />
      ) : (
        <div className="space-y-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Started</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Steps</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground">
                    No runs.
                  </TableCell>
                </TableRow>
              ) : (
                runs.map((run) => (
                  <WorkflowRunRow
                    key={run.workflowRunId}
                    run={run}
                    expanded={expanded === run.workflowRunId}
                    onToggle={() =>
                      setExpanded(expanded === run.workflowRunId ? null : run.workflowRunId)
                    }
                  />
                ))
              )}
            </TableBody>
          </Table>
          {hasNextPage ? (
            <Button
              variant="outline"
              size="sm"
              disabled={isFetchingNextPage}
              onClick={() => void fetchNextPage()}
            >
              Load more
            </Button>
          ) : null}
        </div>
      )}
    </AdminSection>
  );
}

function WorkflowRunRow({
  run,
  expanded,
  onToggle,
}: {
  run: ListWorkflowRunsResult["runs"][number];
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <TableRow>
        <TableCell className="text-xs whitespace-nowrap">
          {formatDateTime(run.createdAt)}
          <div className="text-muted-foreground">{formatRelative(run.createdAt)}</div>
        </TableCell>
        <TableCell>
          <AdminStatusBadge value={run.state} />
        </TableCell>
        <TableCell className="text-xs">{formatDuration(run.createdAt, run.completedAt)}</TableCell>
        <TableCell className="max-w-md text-xs whitespace-normal">
          {run.error ? <div className="text-destructive">{run.error}</div> : null}
          <span className="text-muted-foreground">
            {run.steps.map((step) => step.name).join(" → ")}
          </span>
        </TableCell>
        <TableCell className="text-right">
          <Button variant="ghost" size="sm" onClick={onToggle}>
            {expanded ? "Hide" : "Details"}
          </Button>
        </TableCell>
      </TableRow>
      {expanded ? (
        <TableRow>
          <TableCell colSpan={5} className="bg-muted/30">
            <p className="mb-2 font-mono text-xs text-muted-foreground">{run.workflowRunId}</p>
            <AdminJsonBlock
              value={run.steps.map((step) => ({ name: step.name, state: step.state, out: step.out }))}
            />
          </TableCell>
        </TableRow>
      ) : null}
    </>
  );
}

export function AdminSchedulerPage() {
  const { data, isPending, error } = useQuery({
    queryKey: adminQueryKeys.scheduler(),
    queryFn: () => fetchAdminJson<AdminSchedulerState>("/api/admin/scheduler"),
    refetchInterval: 60_000,
  });

  return (
    <>
      {data ? (
        <>
          <SchedulerConfig state={data} />
          <QStashSchedules state={data} />
          <NextTick state={data} />
        </>
      ) : (
        <AdminQueryState isPending={isPending} error={error} />
      )}
      <WorkflowRuns />
    </>
  );
}
