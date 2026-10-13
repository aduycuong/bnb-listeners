"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import type {
  AdminCollectRunRow,
  AdminContentItemRow,
  AdminSourceDetail,
  PageResult,
} from "@/lib/admin-console/types";

import { AdminCollectRunsTable } from "./admin-collect-runs-table";
import { AdminContentItemsTable } from "./admin-content-items-table";
import { formatDateTime, formatNumber, formatRelative } from "./admin-format";
import { AdminJsonBlock } from "./admin-json-block";
import { AdminKeyValues } from "./admin-key-values";
import { AdminQueryState } from "./admin-query-state";
import { adminQueryKeys } from "./admin-query-keys";
import { AdminSection } from "./admin-section";
import { AdminStatusBadge } from "./admin-status-badge";
import { fetchAdminJson } from "./fetch-admin-json";

const RECENT = 10;

function ViewAll({ href }: { href: string }) {
  return (
    <Link href={href} className="text-sm text-muted-foreground hover:text-foreground hover:underline">
      View all →
    </Link>
  );
}

export function AdminSourceDetailPage({ id }: { id: string }) {
  const source = useQuery({
    queryKey: adminQueryKeys.source(id),
    queryFn: () => fetchAdminJson<AdminSourceDetail>(`/api/admin/sources/${id}`),
  });
  const runs = useQuery({
    queryKey: adminQueryKeys.collectRuns({ sourceId: id, pageSize: RECENT }),
    queryFn: () =>
      fetchAdminJson<PageResult<AdminCollectRunRow>>("/api/admin/collect-runs", {
        sourceId: id,
        pageSize: RECENT,
      }),
  });
  const posts = useQuery({
    queryKey: adminQueryKeys.contentItems({ sourceId: id, kind: "post", pageSize: RECENT }),
    queryFn: () =>
      fetchAdminJson<PageResult<AdminContentItemRow>>("/api/admin/content-items", {
        sourceId: id,
        kind: "post",
        pageSize: RECENT,
      }),
  });

  const data = source.data;
  if (!data) return <AdminQueryState isPending={source.isPending} error={source.error} />;

  return (
    <>
      <AdminSection title={data.name ?? data.url ?? data.id}>
        <AdminKeyValues
          items={[
            ["ID", data.id],
            ["Platform / type", `${data.platform} · ${data.sourceType}`],
            ["External ID", data.externalId],
            [
              "URL",
              data.url ? (
                <a href={data.url} target="_blank" rel="noreferrer" className="hover:underline">
                  {data.url}
                </a>
              ) : null,
            ],
            ["Origin", data.origin],
            [
              "Tier",
              <span key="tier" className="inline-flex items-center gap-2">
                <AdminStatusBadge value={data.activityTier} />
                {data.activityTierLocked ? "locked" : "auto"}
              </span>,
            ],
            ["Posts / day (7d)", data.postsPerDay],
            ["Posts", formatNumber(data.posts)],
            ["Comments + replies", formatNumber(data.comments)],
            ["Followers / members", `${formatNumber(data.followerCount)} / ${formatNumber(data.memberCount)}`],
            [
              "Usage this month",
              `${formatNumber(data.usedThisMonth)} / ${
                data.monthlyRecordLimit === null ? "unlimited" : formatNumber(data.monthlyRecordLimit)
              }`,
            ],
            ["Last collected", formatDateTime(data.lastCollectedAt)],
            [
              "Next post run",
              data.nextPostRunAt
                ? `${formatDateTime(data.nextPostRunAt)} (${formatRelative(data.nextPostRunAt)})`
                : "not scheduled",
            ],
            [
              "Pending refresh checkpoints",
              <Link
                key="refreshes"
                href={`/admin/refresh-schedules?sourceId=${data.id}`}
                className="hover:underline"
              >
                {formatNumber(data.pendingRefreshes)}
              </Link>,
            ],
            ["Created / updated", `${formatDateTime(data.createdAt)} / ${formatDateTime(data.updatedAt)}`],
          ]}
        />
      </AdminSection>

      <AdminSection title="Metadata">
        <AdminJsonBlock value={data.metadata} />
      </AdminSection>

      <AdminSection
        title="Recent collect runs"
        actions={<ViewAll href={`/admin/collect-runs?sourceId=${id}`} />}
      >
        {runs.data ? (
          <AdminCollectRunsTable rows={runs.data.items} showSource={false} />
        ) : (
          <AdminQueryState isPending={runs.isPending} error={runs.error} />
        )}
      </AdminSection>

      <AdminSection
        title="Recent posts"
        actions={<ViewAll href={`/admin/content-items?sourceId=${id}&kind=post`} />}
      >
        {posts.data ? (
          <AdminContentItemsTable rows={posts.data.items} showSource={false} />
        ) : (
          <AdminQueryState isPending={posts.isPending} error={posts.error} />
        )}
      </AdminSection>
    </>
  );
}
