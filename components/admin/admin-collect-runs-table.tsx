import Link from "next/link";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AdminCollectRunRow } from "@/lib/admin-console/types";

import { formatDateTime, formatDuration, formatNumber } from "./admin-format";
import { AdminStatusBadge } from "./admin-status-badge";

/** Numeric top-level stats (inserted, updated, lateArrivals, …); the full JSON is on the run page. */
function summarizeStats(stats: Record<string, unknown> | null): string {
  if (!stats) return "";
  return Object.entries(stats)
    .filter(([, value]) => typeof value === "number")
    .map(([key, value]) => `${key} ${value}`)
    .join(" · ");
}

export function AdminCollectRunsTable({
  rows,
  showSource = true,
}: {
  rows: AdminCollectRunRow[];
  showSource?: boolean;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Created</TableHead>
          <TableHead>Connector</TableHead>
          {showSource ? <TableHead>Source</TableHead> : null}
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Records</TableHead>
          <TableHead>Duration</TableHead>
          <TableHead>Stats / error</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="text-muted-foreground">
              No runs.
            </TableCell>
          </TableRow>
        ) : (
          rows.map((run) => (
            <TableRow key={run.id}>
              <TableCell className="text-xs whitespace-nowrap">
                <Link href={`/admin/collect-runs/${run.id}`} className="hover:underline">
                  {formatDateTime(run.createdAt)}
                </Link>
              </TableCell>
              <TableCell className="text-xs">{run.connector}</TableCell>
              {showSource ? (
                <TableCell className="max-w-48 truncate text-xs">
                  {run.source ? (
                    <Link href={`/admin/sources/${run.source.id}`} className="hover:underline">
                      {run.source.name ?? run.source.id}
                    </Link>
                  ) : (
                    "—"
                  )}
                </TableCell>
              ) : null}
              <TableCell>
                <AdminStatusBadge value={run.status} />
              </TableCell>
              <TableCell className="text-right tabular-nums">{formatNumber(run.itemCount)}</TableCell>
              <TableCell className="text-xs">{formatDuration(run.startedAt, run.finishedAt)}</TableCell>
              <TableCell className="max-w-80 truncate text-xs">
                {run.error ? (
                  <span className="text-destructive">{run.error}</span>
                ) : (
                  <span className="text-muted-foreground">{summarizeStats(run.stats)}</span>
                )}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
