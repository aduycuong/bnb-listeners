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
import type { AdminContentItemDetail } from "@/lib/admin-console/types";

import { formatDateTime, formatNumber, formatRelative } from "./admin-format";
import { AdminJsonBlock } from "./admin-json-block";
import { AdminKeyValues } from "./admin-key-values";
import { AdminQueryState } from "./admin-query-state";
import { adminQueryKeys } from "./admin-query-keys";
import { AdminSection } from "./admin-section";
import { fetchAdminJson } from "./fetch-admin-json";

export function AdminContentItemDetailPage({ id }: { id: string }) {
  const { data, isPending, error } = useQuery({
    queryKey: adminQueryKeys.contentItem(id),
    queryFn: () => fetchAdminJson<AdminContentItemDetail>(`/api/admin/content-items/${id}`),
  });

  if (!data) return <AdminQueryState isPending={isPending} error={error} />;

  const { item, thread, snapshots, refreshSchedule } = data;

  return (
    <>
      <AdminSection title={`${item.kind} · ${formatDateTime(item.publishedAt)}`}>
        <p className="rounded-md border border-border p-3 text-sm whitespace-pre-wrap">
          {item.text || <span className="text-muted-foreground">(no text)</span>}
        </p>
        <AdminKeyValues
          items={[
            ["ID", item.id],
            ["External ID", item.externalId],
            [
              "URL",
              item.url ? (
                <a href={item.url} target="_blank" rel="noreferrer" className="hover:underline">
                  {item.url}
                </a>
              ) : null,
            ],
            [
              "Source",
              item.source ? (
                <Link href={`/admin/sources/${item.source.id}`} className="hover:underline">
                  {item.source.name ?? item.source.id}
                </Link>
              ) : null,
            ],
            [
              "Author",
              item.author ? (
                item.author.url ? (
                  <a href={item.author.url} target="_blank" rel="noreferrer" className="hover:underline">
                    {item.author.name ?? item.author.externalId}
                  </a>
                ) : (
                  item.author.name ?? item.author.externalId
                )
              ) : null,
            ],
            [
              "Parent / root",
              item.parentId || item.rootId ? (
                <span className="space-x-3">
                  {item.parentId ? (
                    <Link href={`/admin/content-items/${item.parentId}`} className="hover:underline">
                      parent
                    </Link>
                  ) : null}
                  {item.rootId ? (
                    <Link href={`/admin/content-items/${item.rootId}`} className="hover:underline">
                      root post
                    </Link>
                  ) : null}
                </span>
              ) : null,
            ],
            [
              "Engagement",
              `${formatNumber(item.likeCount)} likes · ${formatNumber(item.commentCount)} comments · ${formatNumber(item.shareCount)} shares · ${formatNumber(item.viewCount)} views`,
            ],
            ["Reactions", item.reactions ? JSON.stringify(item.reactions) : null],
            ["Origin / language", `${item.origin} · ${item.language ?? "—"}`],
            ["First seen / last collected", `${formatDateTime(item.firstSeenAt)} / ${formatDateTime(item.lastCollectedAt)}`],
            [
              "Collect run",
              item.collectRunId ? (
                <Link href={`/admin/collect-runs/${item.collectRunId}`} className="hover:underline">
                  {item.collectRunId}
                </Link>
              ) : null,
            ],
            ["Content hash", item.contentHash],
            [
              "Media",
              item.media.length > 0 ? (
                <span className="space-x-3">
                  {item.media.map((media, index) => (
                    <a key={media.url} href={media.url} target="_blank" rel="noreferrer" className="hover:underline">
                      {media.type} {index + 1}
                    </a>
                  ))}
                </span>
              ) : null,
            ],
          ]}
        />
      </AdminSection>

      {item.kind === "post" ? (
        <AdminSection title="Comment refresh">
          {refreshSchedule ? (
            <AdminKeyValues
              items={[
                [
                  "Next checkpoint",
                  `+${refreshSchedule.checkpointHours}h · ${formatDateTime(refreshSchedule.nextRefreshAt)} (${formatRelative(refreshSchedule.nextRefreshAt)})`,
                ],
                [
                  "Comments collected",
                  refreshSchedule.commentsCollectedCount === null
                    ? "never"
                    : `${formatNumber(refreshSchedule.commentsCollectedCount)} at ${formatDateTime(refreshSchedule.commentsCollectedAt)}`,
                ],
              ]}
            />
          ) : (
            <p className="text-sm text-muted-foreground">No pending checkpoint (all passed or never scheduled).</p>
          )}
        </AdminSection>
      ) : null}

      <AdminSection title={`Engagement snapshots (${snapshots.length})`}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Captured</TableHead>
              <TableHead className="text-right">Likes</TableHead>
              <TableHead className="text-right">Comments</TableHead>
              <TableHead className="text-right">Shares</TableHead>
              <TableHead className="text-right">Views</TableHead>
              <TableHead>Run</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {snapshots.map((snapshot) => (
              <TableRow key={`${snapshot.capturedAt}-${snapshot.collectRunId}`}>
                <TableCell className="text-xs">{formatDateTime(snapshot.capturedAt)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatNumber(snapshot.likeCount)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatNumber(snapshot.commentCount)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatNumber(snapshot.shareCount)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatNumber(snapshot.viewCount)}</TableCell>
                <TableCell className="text-xs">
                  {snapshot.collectRunId ? (
                    <Link href={`/admin/collect-runs/${snapshot.collectRunId}`} className="hover:underline">
                      run
                    </Link>
                  ) : (
                    "—"
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </AdminSection>

      <AdminSection
        title={`Thread (${formatNumber(data.threadTotal)})`}
        description={
          data.threadTotal > thread.length ? `Showing the first ${thread.length}.` : undefined
        }
      >
        {thread.length === 0 ? (
          <p className="text-sm text-muted-foreground">No comments or replies stored.</p>
        ) : (
          <ul className="space-y-2">
            {thread.map((row) => {
              const isReply = row.kind === "reply";
              return (
                <li
                  key={row.id}
                  className={`rounded-md border border-border p-3 text-sm ${isReply ? "ml-8" : ""}`}
                >
                  <div className="mb-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{row.authorName ?? "unknown"}</span>
                    <span>{row.kind}</span>
                    <Link href={`/admin/content-items/${row.id}`} className="hover:underline">
                      {formatDateTime(row.publishedAt)}
                    </Link>
                    <span>{formatNumber(row.likeCount)} likes</span>
                  </div>
                  <p className="whitespace-pre-wrap">{row.text}</p>
                </li>
              );
            })}
          </ul>
        )}
      </AdminSection>

      <AdminSection title="Metadata">
        <AdminJsonBlock value={item.metadata} />
      </AdminSection>
    </>
  );
}
