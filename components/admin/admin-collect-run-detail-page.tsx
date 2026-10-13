"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import type { AdminCollectRunDetail } from "@/lib/admin-console/types";

import { AdminCollectRunPayload } from "./admin-collect-run-payload";
import { formatDateTime, formatDuration, formatNumber } from "./admin-format";
import { AdminJsonBlock } from "./admin-json-block";
import { AdminKeyValues } from "./admin-key-values";
import { AdminQueryState } from "./admin-query-state";
import { adminQueryKeys } from "./admin-query-keys";
import { AdminSection } from "./admin-section";
import { AdminStatusBadge } from "./admin-status-badge";
import { fetchAdminJson } from "./fetch-admin-json";

export function AdminCollectRunDetailPage({ id }: { id: string }) {
  const { data, isPending, error } = useQuery({
    queryKey: adminQueryKeys.collectRun(id),
    queryFn: () => fetchAdminJson<AdminCollectRunDetail>(`/api/admin/collect-runs/${id}`),
    refetchInterval: (query) =>
      query.state.data?.status === "pending" || query.state.data?.status === "running"
        ? 15_000
        : false,
  });

  if (!data) return <AdminQueryState isPending={isPending} error={error} />;

  return (
    <>
      <AdminSection title={`${data.connector} run`}>
        <AdminKeyValues
          items={[
            ["ID", data.id],
            ["Status", <AdminStatusBadge key="status" value={data.status} />],
            [
              "Source",
              data.source ? (
                <Link href={`/admin/sources/${data.source.id}`} className="hover:underline">
                  {data.source.name ?? data.source.id}
                </Link>
              ) : null,
            ],
            ["Records delivered", formatNumber(data.itemCount)],
            [
              "Content items from this run",
              <Link
                key="items"
                href={`/admin/content-items?collectRunId=${data.id}`}
                className="hover:underline"
              >
                {formatNumber(data.contentItems)}
              </Link>,
            ],
            ["Created", formatDateTime(data.createdAt)],
            ["Started / finished", `${formatDateTime(data.startedAt)} / ${formatDateTime(data.finishedAt)}`],
            ["Duration", formatDuration(data.startedAt, data.finishedAt)],
            ["Workflow run", data.workflowRunId],
            ["Provider job (snapshot)", data.externalJobId],
            ["Payload key", data.payloadKey],
            [
              "Error",
              data.error ? <span className="text-destructive">{data.error}</span> : null,
            ],
          ]}
        />
      </AdminSection>

      <AdminSection title="Params">
        <AdminJsonBlock value={data.params} />
      </AdminSection>

      <AdminSection title="Stats">
        <AdminJsonBlock value={data.stats} />
      </AdminSection>

      <AdminSection title="Raw payload">
        {data.hasPayload ? (
          <AdminCollectRunPayload collectRunId={data.id} />
        ) : (
          <p className="text-sm text-muted-foreground">No payload stored for this run.</p>
        )}
      </AdminSection>
    </>
  );
}
