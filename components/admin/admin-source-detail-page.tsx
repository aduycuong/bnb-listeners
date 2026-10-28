"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { getCronFriendlyText } from "@/lib/common/cron-presets";
import type {
  AdminCollectRunRow,
  AdminContentItemRow,
  AdminSourceDetail,
  PageResult,
} from "@/lib/admin-console/types";

import { AdminCollectRunsTable } from "./admin-collect-runs-table";
import { AdminContentItemsTable } from "./admin-content-items-table";
import { AdminDeleteSourceDialog } from "./admin-delete-source-dialog";
import { formatDateTime, formatNumber, formatRelative } from "./admin-format";
import { AdminJsonBlock } from "./admin-json-block";
import { AdminKeyValues } from "./admin-key-values";
import { AdminQueryState } from "./admin-query-state";
import { adminQueryKeys } from "./admin-query-keys";
import { AdminSection } from "./admin-section";
import { AdminSourceSettingsForm } from "./admin-source-settings-form";
import {
  AdminRunSyntheticSourceButton,
  AdminSyntheticSourceSettings,
} from "./admin-synthetic-source-settings";
import { AdminTierBadge, describeTierSchedule } from "./admin-tier-badge";
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

  const synthetic = data.origin === "synthetic";
  const config = data.syntheticConfig;
  // Tier, budgets and refresh checkpoints belong to scanned sources; a synthetic one runs on its cron.
  const scheduleItems: [string, ReactNode][] = synthetic
    ? [
        [
          "Synthetic schedule",
          config
            ? `${config.enabled ? "" : "off · "}${getCronFriendlyText(config.cronConfig.cron)} (${config.cronConfig.timezone}) · ${config.postsPerRun} posts and ${config.briefsPerRun} briefs per run`
            : "not configured",
        ],
        ["Posts", formatNumber(data.posts)],
        ["Comments + replies", formatNumber(data.comments)],
        ["Last collected", formatDateTime(data.lastCollectedAt)],
      ]
    : [
        [
          "Tier",
          <span key="tier" className="inline-flex items-center gap-2">
            <AdminTierBadge
              tier={data.activityTier}
              manual={data.tierMode === "manual"}
              lines={describeTierSchedule(data, data.tierRules)}
            />
            {data.tierMode === "manual" ? "manual" : "automatic"}
            {data.intervalHours !== null ? ` · every ${data.intervalHours}h` : null}
          </span>,
        ],
        [`Posts / day (${data.tierRules.windowDays}d)`, data.postsPerDay],
        ["Posts", formatNumber(data.posts)],
        ["Comments + replies", formatNumber(data.comments)],
        ["Followers / members", `${formatNumber(data.followerCount)} / ${formatNumber(data.memberCount)}`],
        [
          "Usage this month",
          `${formatNumber(data.usedThisMonth)} / ${
            data.monthlyRecordLimit === null ? "unlimited" : formatNumber(data.monthlyRecordLimit)
          }`,
        ],
        [
          "Usage today (Vietnam time)",
          `${formatNumber(data.usedToday)} / ${
            data.dailyRecordLimit === null ? "unlimited" : formatNumber(data.dailyRecordLimit)
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
      ];

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
            ...scheduleItems,
            ["Created / updated", `${formatDateTime(data.createdAt)} / ${formatDateTime(data.updatedAt)}`],
          ]}
        />
      </AdminSection>

      {synthetic ? (
        <AdminSection
          title="Synthetic schedule"
          description="Each tick the model writes briefs from the topics, then posts and comments as the panel's personas. Saving updates the QStash schedule; runs already started keep their params."
          actions={<AdminRunSyntheticSourceButton source={data} />}
        >
          <AdminSyntheticSourceSettings key={data.updatedAt} source={data} />
        </AdminSection>
      ) : (
        <AdminSection
          title="Collection settings"
          description="Intervals and automatic-tier thresholds are shared by all sources; edit them in Settings."
        >
          <AdminSourceSettingsForm key={data.updatedAt} source={data} />
        </AdminSection>
      )}

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

      {data.origin === "connector" || synthetic ? (
        <AdminSection
          title="Delete source"
          description={
            data.activeRuns > 0
              ? `${data.activeRuns} collect run${data.activeRuns === 1 ? " is" : "s are"} still pending or running; delete once ${data.activeRuns === 1 ? "it finishes" : "they finish"}.`
              : "Removes the source with its posts, comments and their analysis, and takes it out of every project that follows it."
          }
          actions={<AdminDeleteSourceDialog source={data} />}
        >
          {null}
        </AdminSection>
      ) : null}
    </>
  );
}
