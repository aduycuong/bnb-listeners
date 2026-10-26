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
import type { ListAdminSourcesResult } from "@/lib/admin-console/types";

import { formatDateTime, formatNumber, formatRelative } from "./admin-format";
import { AdminQueryState } from "./admin-query-state";
import { adminQueryKeys } from "./admin-query-keys";
import { AdminSection } from "./admin-section";
import { AdminStatusBadge } from "./admin-status-badge";
import { AdminTierBadge, describeTierSchedule } from "./admin-tier-badge";
import { fetchAdminJson } from "./fetch-admin-json";

export function AdminSourcesPage() {
  const { data, isPending, error } = useQuery({
    queryKey: adminQueryKeys.sources(),
    queryFn: () => fetchAdminJson<ListAdminSourcesResult>("/api/admin/sources"),
  });

  return (
    <AdminSection
      title="Sources"
      description="Usage is Bright Data records across all connectors, this month (UTC) and today (Vietnam time). Next post run = last post run + tier interval. Hover a tier to see how often it runs; a lock means the tier is set by hand."
    >
      {!data ? (
        <AdminQueryState isPending={isPending} error={error} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Source</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead className="text-right">Posts</TableHead>
              <TableHead className="text-right">Comments</TableHead>
              <TableHead className="text-right">Posts/day ({data.tierRules.windowDays}d)</TableHead>
              <TableHead className="text-right">Month: used / limit</TableHead>
              <TableHead className="text-right">Today: used / limit</TableHead>
              <TableHead>Last post run</TableHead>
              <TableHead>Next post run</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((source) => (
              <TableRow key={source.id}>
                <TableCell className="max-w-72">
                  <Link
                    href={`/admin/sources/${source.id}`}
                    className="block truncate font-medium hover:underline"
                  >
                    {source.name ?? source.url ?? source.id}
                  </Link>
                  <span className="text-xs text-muted-foreground">
                    {source.platform} · {source.sourceType} · {source.origin}
                  </span>
                </TableCell>
                <TableCell>
                  <AdminTierBadge
                    tier={source.activityTier}
                    manual={source.tierMode === "manual"}
                    lines={describeTierSchedule(source, data.tierRules)}
                  />
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatNumber(source.posts)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatNumber(source.comments)}
                </TableCell>
                <TableCell className="text-right tabular-nums">{source.postsPerDay}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatNumber(source.usedThisMonth)} /{" "}
                  {source.monthlyRecordLimit === null ? "∞" : formatNumber(source.monthlyRecordLimit)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatNumber(source.usedToday)} /{" "}
                  {source.dailyRecordLimit === null ? "∞" : formatNumber(source.dailyRecordLimit)}
                </TableCell>
                <TableCell>
                  {source.lastPostRun ? (
                    <Link
                      href={`/admin/collect-runs/${source.lastPostRun.id}`}
                      className="inline-flex items-center gap-2 hover:underline"
                    >
                      <AdminStatusBadge value={source.lastPostRun.status} />
                      <span className="text-xs">{formatDateTime(source.lastPostRun.createdAt)}</span>
                    </Link>
                  ) : (
                    <span className="text-xs text-muted-foreground">never (not scheduled)</span>
                  )}
                </TableCell>
                <TableCell className="text-xs">{formatRelative(source.nextPostRunAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </AdminSection>
  );
}
