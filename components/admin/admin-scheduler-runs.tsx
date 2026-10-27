"use client";

import { useState, type ReactNode } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { JOB_RUN_STATES, WORKFLOW_RUN_STATES } from "@/lib/admin-console/constants";
import type {
  AdminJobRun,
  AdminWorkflowRun,
  ListJobRunsResult,
  ListWorkflowRunsResult,
} from "@/lib/admin-console/types";
import { WORKFLOW_NAMES } from "@/lib/workflows/constants";

import { AdminFilterSelect } from "./admin-filter-select";
import { formatDateTime, formatDuration, formatRelative } from "./admin-format";
import { AdminJsonBlock } from "./admin-json-block";
import { AdminQueryState } from "./admin-query-state";
import { adminQueryKeys } from "./admin-query-keys";
import { AdminSection } from "./admin-section";
import { AdminStatusBadge } from "./admin-status-badge";
import { fetchAdminJson } from "./fetch-admin-json";

type RunsTab = "workflows" | "jobs";

function StartedCell({ at }: { at: string }) {
  return (
    <TableCell className="text-xs whitespace-nowrap">
      {formatDateTime(at)}
      <div className="text-muted-foreground">{formatRelative(at)}</div>
    </TableCell>
  );
}

/** Row with a Details toggle that opens a full-width row underneath. */
function ExpandableRow({
  cells,
  details,
  colSpan,
}: {
  cells: ReactNode;
  details: ReactNode;
  colSpan: number;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <TableRow>
        {cells}
        <TableCell className="text-right">
          <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)}>
            {expanded ? "Hide" : "Details"}
          </Button>
        </TableCell>
      </TableRow>
      {expanded ? (
        <TableRow>
          <TableCell colSpan={colSpan} className="bg-muted/30">
            {details}
          </TableCell>
        </TableRow>
      ) : null}
    </>
  );
}

function LoadMore({
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
}: {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => unknown;
}) {
  return hasNextPage ? (
    <Button variant="outline" size="sm" disabled={isFetchingNextPage} onClick={() => void fetchNextPage()}>
      {isFetchingNextPage ? "Loading…" : "Load more"}
    </Button>
  ) : null;
}

function WorkflowRunRow({ run, showWorkflow }: { run: AdminWorkflowRun; showWorkflow: boolean }) {
  return (
    <ExpandableRow
      colSpan={showWorkflow ? 6 : 5}
      cells={
        <>
          <StartedCell at={run.createdAt} />
          {showWorkflow ? <TableCell className="text-xs">{run.workflow}</TableCell> : null}
          <TableCell>
            <AdminStatusBadge value={run.state} />
          </TableCell>
          <TableCell className="text-xs">{formatDuration(run.createdAt, run.completedAt)}</TableCell>
          <TableCell className="max-w-md text-xs whitespace-normal">
            {run.error ? <div className="text-destructive">{run.error}</div> : null}
            <span className="text-muted-foreground">{run.steps.map((step) => step.name).join(" → ")}</span>
          </TableCell>
        </>
      }
      details={
        <>
          <p className="mb-2 font-mono text-xs text-muted-foreground">
            {run.workflowRunId} · {run.workflowUrl}
          </p>
          <AdminJsonBlock
            value={run.steps.map((step) => ({
              name: step.name,
              state: step.state,
              createdAt: step.createdAt,
              out: step.out,
            }))}
          />
        </>
      }
    />
  );
}

function WorkflowRuns() {
  const [workflow, setWorkflow] = useState("");
  const [state, setState] = useState("");
  const filters = { workflow, state };

  const { data, isPending, error, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: adminQueryKeys.workflowRuns(filters),
    queryFn: ({ pageParam }) =>
      fetchAdminJson<ListWorkflowRunsResult>("/api/admin/scheduler/workflow-runs", {
        ...filters,
        cursor: pageParam,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.cursor ?? undefined,
    refetchInterval: 60_000,
  });

  const runs = data?.pages.flatMap((page) => page.runs) ?? [];
  const showWorkflow = !workflow;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <AdminFilterSelect label="workflows" value={workflow} options={WORKFLOW_NAMES} onChange={setWorkflow} />
        <AdminFilterSelect label="states" value={state} options={WORKFLOW_RUN_STATES} onChange={setState} />
      </div>
      {!data ? (
        <AdminQueryState isPending={isPending} error={error} />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Started</TableHead>
                {showWorkflow ? <TableHead>Workflow</TableHead> : null}
                <TableHead>State</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Steps</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={showWorkflow ? 6 : 5} className="text-muted-foreground">
                    No runs.
                  </TableCell>
                </TableRow>
              ) : (
                runs.map((run) => <WorkflowRunRow key={run.workflowRunId} run={run} showWorkflow={showWorkflow} />)
              )}
            </TableBody>
          </Table>
          <LoadMore hasNextPage={hasNextPage} isFetchingNextPage={isFetchingNextPage} fetchNextPage={fetchNextPage} />
        </>
      )}
    </div>
  );
}

function JobRunRow({ run }: { run: AdminJobRun }) {
  return (
    <ExpandableRow
      colSpan={6}
      cells={
        <>
          <StartedCell at={run.createdAt} />
          <TableCell className="text-xs">
            {run.jobName ?? "—"}
            {run.scheduleId ? <div className="text-muted-foreground">{run.scheduleId}</div> : null}
          </TableCell>
          <TableCell>
            <AdminStatusBadge value={run.state} />
            {run.nextDeliveryAt ? (
              <div className="mt-1 text-xs text-muted-foreground">retry {formatRelative(run.nextDeliveryAt)}</div>
            ) : null}
          </TableCell>
          <TableCell className="text-xs">{formatDuration(run.createdAt, run.updatedAt)}</TableCell>
          <TableCell className="max-w-md text-xs whitespace-normal">
            {run.failedAttempts > 0 ? (
              <div className="text-muted-foreground">{run.failedAttempts} failed attempts</div>
            ) : null}
            {run.error ? <div className="text-destructive">{run.error}</div> : null}
          </TableCell>
        </>
      }
      details={
        <>
          <p className="mb-2 font-mono text-xs text-muted-foreground">{run.messageId}</p>
          <AdminJsonBlock value={run.events} />
        </>
      }
    />
  );
}

function JobRuns() {
  const [state, setState] = useState("");
  const filters = { state };

  const { data, isPending, error, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: adminQueryKeys.jobRuns(filters),
    queryFn: ({ pageParam }) =>
      fetchAdminJson<ListJobRunsResult>("/api/admin/scheduler/job-runs", { ...filters, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.cursor ?? undefined,
    refetchInterval: 60_000,
  });

  const runs = data?.pages.flatMap((page) => page.runs) ?? [];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <AdminFilterSelect label="states" value={state} options={JOB_RUN_STATES} onChange={setState} />
      </div>
      {!data ? (
        <AdminQueryState isPending={isPending} error={error} />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Created</TableHead>
                <TableHead>Job</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Errors</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground">
                    No job messages.
                  </TableCell>
                </TableRow>
              ) : (
                runs.map((run, index) => <JobRunRow key={`${run.messageId}-${index}`} run={run} />)
              )}
            </TableBody>
          </Table>
          <LoadMore hasNextPage={hasNextPage} isFetchingNextPage={isFetchingNextPage} fetchNextPage={fetchNextPage} />
        </>
      )}
    </div>
  );
}

/** Workflow runs (Upstash Workflow logs) and job messages (QStash logs) of this server. */
export function AdminSchedulerRuns() {
  const [tab, setTab] = useState<RunsTab>("workflows");

  return (
    <AdminSection
      title="Runs"
      description={
        tab === "workflows"
          ? "Workflow runs of this server, from the Upstash Workflow logs API."
          : "Messages to /api/qstash/callback (alerts, reports), from the QStash logs API."
      }
      actions={
        <Tabs value={tab} onValueChange={(value) => setTab(value as RunsTab)}>
          <TabsList>
            <TabsTrigger value="workflows">Workflows</TabsTrigger>
            <TabsTrigger value="jobs">Jobs</TabsTrigger>
          </TabsList>
        </Tabs>
      }
    >
      {tab === "workflows" ? <WorkflowRuns /> : <JobRuns />}
    </AdminSection>
  );
}
