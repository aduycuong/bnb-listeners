"use client";

import Link from "next/link";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  AdminRefreshScheduleRow,
  AdminSourceRow,
  PageResult,
} from "@/lib/admin-console/types";

import { AdminFilterSelect } from "./admin-filter-select";
import { formatDateTime, formatNumber, formatRelative } from "./admin-format";
import { AdminPager } from "./admin-pager";
import { AdminQueryState } from "./admin-query-state";
import { adminQueryKeys } from "./admin-query-keys";
import { AdminSection } from "./admin-section";
import { AdminStatusBadge } from "./admin-status-badge";
import { fetchAdminJson } from "./fetch-admin-json";
import { useAdminSearchParams } from "./use-admin-search-params";

const FILTER_KEYS = ["sourceId", "due"] as const;
const DUE_OPTIONS = ["overdue", "upcoming"] as const;

export function AdminRefreshSchedulesPage() {
  const { values, page, setValue } = useAdminSearchParams(FILTER_KEYS);

  const sources = useQuery({
    queryKey: adminQueryKeys.sources(),
    queryFn: () => fetchAdminJson<{ items: AdminSourceRow[] }>("/api/admin/sources"),
  });

  const filters = { ...values, page };
  const { data, isPending, error, isFetching } = useQuery({
    queryKey: adminQueryKeys.refreshSchedules(filters),
    queryFn: () =>
      fetchAdminJson<PageResult<AdminRefreshScheduleRow>>(
        "/api/admin/refresh-schedules",
        filters,
      ),
    placeholderData: keepPreviousData,
  });

  return (
    <AdminSection
      title="Refresh schedules"
      description="Next comment-refresh checkpoint per post (item_refresh_schedules), soonest first."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <AdminFilterSelect
            label="sources"
            value={values.sourceId}
            options={(sources.data?.items ?? []).map((source) => ({
              value: source.id,
              label: source.name ?? source.id,
            }))}
            onChange={(value) => setValue("sourceId", value)}
          />
          <AdminFilterSelect
            label="checkpoints"
            value={values.due}
            options={DUE_OPTIONS}
            onChange={(value) => setValue("due", value)}
          />
        </div>
      }
    >
      {data ? (
        <div className={isFetching ? "space-y-3 opacity-60" : "space-y-3"}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Next refresh</TableHead>
                <TableHead>Checkpoint</TableHead>
                <TableHead>Post</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Published</TableHead>
                <TableHead className="text-right">Comments now</TableHead>
                <TableHead>Collected</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-muted-foreground">
                    No checkpoints.
                  </TableCell>
                </TableRow>
              ) : (
                data.items.map((row) => (
                  <TableRow key={row.contentItemId} className="align-top">
                    <TableCell className="text-xs whitespace-nowrap">
                      <div>{formatDateTime(row.nextRefreshAt)}</div>
                      <div className="mt-1 flex items-center gap-1 text-muted-foreground">
                        {row.overdue ? (
                          <AdminStatusBadge value="overdue" />
                        ) : null}
                        {formatRelative(row.nextRefreshAt)}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">+{row.checkpointHours}h</TableCell>
                    <TableCell className="max-w-md min-w-56 text-xs whitespace-normal">
                      <Link
                        href={`/admin/content-items/${row.contentItemId}`}
                        className="line-clamp-2 hover:underline"
                      >
                        {row.text || "(no text)"}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-40 truncate text-xs">
                      {row.source ? (
                        <Link href={`/admin/sources/${row.source.id}`} className="hover:underline">
                          {row.source.name ?? row.source.id}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {formatDateTime(row.publishedAt)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(row.commentCount)}
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {row.commentsCollectedCount === null
                        ? "never"
                        : `${formatNumber(row.commentsCollectedCount)} · ${formatDateTime(row.commentsCollectedAt)}`}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <AdminPager
            page={data.page}
            pageSize={data.pageSize}
            total={data.total}
            onPageChange={(next) => setValue("page", String(next))}
          />
        </div>
      ) : (
        <AdminQueryState isPending={isPending} error={error} />
      )}
    </AdminSection>
  );
}
