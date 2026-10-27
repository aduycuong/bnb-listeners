"use client";

import Link from "next/link";
import { useIsFetching, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCwIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AdminSchedulerState } from "@/lib/admin-console/types";

import { formatDateTime, formatNumber, formatRelative } from "./admin-format";
import { AdminKeyValues } from "./admin-key-values";
import { AdminQueryState } from "./admin-query-state";
import { adminQueryKeys } from "./admin-query-keys";
import { AdminSchedulerRuns } from "./admin-scheduler-runs";
import { AdminSchedulerSchedules } from "./admin-scheduler-schedules";
import { AdminSection } from "./admin-section";
import { AdminStatusBadge } from "./admin-status-badge";
import { AdminTierBadge } from "./admin-tier-badge";
import { fetchAdminJson } from "./fetch-admin-json";

function SchedulerConfig({ state }: { state: AdminSchedulerState }) {
  return (
    <AdminSection
      title="Scheduler"
      description="Intervals and checkpoints are edited in Settings; schedule crons live in code (lib/schedules/config.ts)."
      actions={
        <div className="flex items-center gap-3">
          <Link href="/admin/settings" className="text-sm text-muted-foreground hover:text-foreground hover:underline">
            Edit settings →
          </Link>
          <RefreshButton />
        </div>
      }
    >
      <AdminKeyValues
        items={[
          ["Tick interval", `${state.config.intervalMinutes} min`],
          [
            "Post run interval by tier",
            Object.entries(state.config.tierRules.intervalHours)
              .map(([tier, hours]) => `${tier} ${hours}h`)
              .join(" · "),
          ],
          [
            "Automatic tier",
            `hot ≥ ${state.config.tierRules.minPostsPerDay.hot} · normal ≥ ${state.config.tierRules.minPostsPerDay.normal} posts/day over ${state.config.tierRules.windowDays}d`,
          ],
          ["TikTok keyword search", `every ${state.config.tierRules.searchIntervalHours}h`],
          [
            "Comment refresh checkpoints",
            state.config.checkpointsHours.map((hours) => `+${hours}h`).join(" · "),
          ],
        ]}
      />
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
                    <AdminTierBadge
                      tier={source.activityTier}
                      lines={[`Post run every ${source.intervalHours}h after the last one.`]}
                    />
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
                    {budget
                      ? `${formatNumber(budget.remaining)} (${budget.limitedBy === "day" ? "today" : "this month"})`
                      : "∞"}
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

function RefreshButton() {
  const queryClient = useQueryClient();
  const fetching = useIsFetching({ queryKey: ["admin"] });
  const updatedAt = queryClient.getQueryState(adminQueryKeys.scheduler())?.dataUpdatedAt;

  return (
    <div className="flex items-center gap-2">
      {updatedAt ? (
        <span className="text-xs text-muted-foreground">Updated {formatDateTime(new Date(updatedAt).toISOString())}</span>
      ) : null}
      <Button
        variant="outline"
        size="sm"
        disabled={fetching > 0}
        onClick={() =>
          void Promise.all(
            [adminQueryKeys.scheduler(), ["admin", "workflow-runs"], ["admin", "job-runs"]].map((queryKey) =>
              queryClient.invalidateQueries({ queryKey }),
            ),
          )
        }
      >
        <RefreshCwIcon className={fetching > 0 ? "animate-spin" : undefined} />
        Refresh
      </Button>
    </div>
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
          <AdminSchedulerSchedules state={data} />
          <NextTick state={data} />
        </>
      ) : (
        <AdminQueryState isPending={isPending} error={error} />
      )}
      <AdminSchedulerRuns />
    </>
  );
}
