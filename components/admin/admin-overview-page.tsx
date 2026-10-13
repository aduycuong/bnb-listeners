"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AdminOverview } from "@/lib/admin-console/types";

import { formatDateTime, formatNumber } from "./admin-format";
import { AdminQueryState } from "./admin-query-state";
import { adminQueryKeys } from "./admin-query-keys";
import { AdminSection } from "./admin-section";
import { AdminStatCard } from "./admin-stat-card";
import { AdminStatusBadge } from "./admin-status-badge";
import { fetchAdminJson } from "./fetch-admin-json";

export function AdminOverviewPage() {
  const { data, isPending, error } = useQuery({
    queryKey: adminQueryKeys.overview(),
    queryFn: () => fetchAdminJson<AdminOverview>("/api/admin/overview"),
    refetchInterval: 60_000,
  });

  if (!data) return <AdminQueryState isPending={isPending} error={error} />;

  return (
    <>
      <AdminSection title="Raw store">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <AdminStatCard
            label="Sources"
            value={data.sources.total}
            href="/admin/sources"
            breakdown={data.sources.byTier}
          />
          <AdminStatCard
            label="Content items"
            value={data.contentItems.total}
            href="/admin/content-items"
            breakdown={data.contentItems.byKind}
          />
          <AdminStatCard
            label="By origin"
            value={data.contentItems.total}
            breakdown={data.contentItems.byOrigin}
          />
          <AdminStatCard
            label="New items (24h)"
            value={data.contentItems.firstSeenLast24h}
            href="/admin/content-items"
          />
          <AdminStatCard
            label="Refresh checkpoints"
            value={data.refreshSchedules.total}
            href="/admin/refresh-schedules"
            breakdown={{ overdue: data.refreshSchedules.overdue }}
          />
        </div>
      </AdminSection>

      <AdminSection
        title="Usage this month"
        description={`Bright Data records since ${formatDateTime(data.usage.monthStart)} (sum of collect_runs.item_count).`}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <AdminStatCard
            label="Records"
            value={data.usage.recordsThisMonth}
            breakdown={data.usage.byConnector}
          />
        </div>
      </AdminSection>

      <AdminSection
        title="Collect runs (24h)"
        description={
          <>
            {formatNumber(data.collectRuns.active)} pending or running.{" "}
            <Link href="/admin/collect-runs" className="underline">
              All runs
            </Link>
          </>
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Connector</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Runs</TableHead>
              <TableHead className="text-right">Records</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.collectRuns.last24hByConnector.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground">
                  No runs in the last 24 hours.
                </TableCell>
              </TableRow>
            ) : (
              data.collectRuns.last24hByConnector.map((row) => (
                <TableRow key={`${row.connector}-${row.status}`}>
                  <TableCell>
                    <Link
                      href={`/admin/collect-runs?connector=${row.connector}&status=${row.status}`}
                      className="hover:underline"
                    >
                      {row.connector}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <AdminStatusBadge value={row.status} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatNumber(row.count)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatNumber(row.items)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </AdminSection>
    </>
  );
}
